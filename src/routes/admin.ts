import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import * as PrismaClientModule from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createAuditLog } from '../lib/audit';
import { createNotification } from '../lib/notifications';
import { notifySavedSearchesForAd } from '../lib/savedSearchNotify';
import { z } from 'zod';

const AdStatus = (PrismaClientModule as any).AdStatus;
const ReportStatus = (PrismaClientModule as any).ReportStatus;
const Role = (PrismaClientModule as any).Role;

const router = Router();

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Previše pokušaja prijave.' }
});

// ----- Helpers -----
function getAdminId(req: Request): string {
  return (req as any).user?.id ?? (req as any).user?.userId ?? '';
}

// Simple in-memory cache for stats (60s)
let statsCache: { data: unknown; at: number } | null = null;
const STATS_CACHE_MS = 60_000;

const FALLBACK_STATS_OBJ = { totalUsers: 0, totalAds: 0, activeAds: 0, premiumAds: 0, reportedAds: 0, pendingAds: 0, revenueTotal: 0, lastUsers: [] as any[], lastAds: [] as any[] };

// ----- Stats (dashboard) -----
router.get('/stats', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const s = res as any;
  try {
    const now = Date.now();
    if (statsCache && now - statsCache.at < STATS_CACHE_MS) {
      return s.json(statsCache.data);
    }
    const [
      totalUsers,
      totalAds,
      activeAds,
      premiumAds,
      reportedAdsCount,
      pendingAdsCount,
      revenueAgg,
      lastUsers,
      lastAds
    ] = await Promise.all([
      prisma.user.count(),
      prisma.ad.count(),
      prisma.ad.count({ where: { status: AdStatus.AKTIVAN } }),
      prisma.ad.count({ where: { featuredUntil: { gt: new Date() } } }),
      prisma.report.count({ where: { status: ReportStatus.open } }),
      prisma.ad.count({ where: { status: AdStatus.NA_CEKANJU } }),
      prisma.payment.aggregate({ where: { status: 'succeeded' }, _sum: { amount: true } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, ime: true, email: true, createdAt: true, role: true }
      }),
      prisma.ad.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { images: { orderBy: { order: 'asc' }, take: 1 }, vlasnik: { select: { ime: true, email: true } } }
      })
    ]);
    const revenueTotal = (revenueAgg?._sum?.amount ?? 0) / 100;
    const data = {
      totalUsers: totalUsers ?? 0,
      totalAds: totalAds ?? 0,
      activeAds: activeAds ?? 0,
      premiumAds: premiumAds ?? 0,
      reportedAds: reportedAdsCount ?? 0,
      pendingAds: pendingAdsCount ?? 0,
      revenueTotal,
      lastUsers: lastUsers ?? [],
      lastAds: lastAds ?? []
    };
    statsCache = { data, at: now };
    return s.json(data);
  } catch (err: any) {
    const e = err as Error;
    console.error('[admin/stats] DB error:', e?.message ?? e);
    if (e?.stack) console.error('[admin/stats] stack:', e.stack);
    if (err?.cause) console.error('[admin/stats] cause:', err.cause);
    return s.status(200).json(FALLBACK_STATS_OBJ);
  }
}) as any);

// ----- Users -----
const usersQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  isBanned: z.enum(['true', 'false']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional()
});

router.get('/users', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const parsed = usersQuerySchema.safeParse(r.query);
  if (!parsed.success) return s.status(400).json({ error: 'Nevalidni parametri', details: parsed.error.flatten() });
  const { page, limit, search, isBanned, role } = parsed.data;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (search?.trim()) {
    where.OR = [
      { email: { contains: search.trim(), mode: 'insensitive' } },
      { ime: { contains: search.trim(), mode: 'insensitive' } }
    ];
  }
  if (isBanned === 'true') where.banned = true;
  if (isBanned === 'false') where.banned = false;
  if (role) where.role = role;
  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, ime: true, email: true, telefon: true, role: true, banned: true, bannedReason: true, createdAt: true, _count: { select: { ads: true } } }
      }),
      prisma.user.count({ where })
    ]);
    s.json({ users, total, page, limit });
  } catch (err) {
    console.error('Admin users list:', err);
    s.status(500).json({ error: 'Greška pri učitavanju korisnika' });
  }
}) as any);

router.get('/users/:id', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const { id } = r.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, ime: true, email: true, telefon: true, role: true, banned: true, bannedReason: true,
        createdAt: true, updatedAt: true,
        _count: { select: { ads: true } },
        ads: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, naslov: true, status: true, createdAt: true } }
      }
    });
    if (!user) return s.status(404).json({ error: 'Korisnik nije pronađen' });
    s.json(user);
  } catch (err) {
    s.status(500).json({ error: 'Greška pri učitavanju korisnika' });
  }
}) as any);

router.post('/users/:id/ban', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  const body = z.object({ reason: z.string().optional() }).safeParse(r.body || {});
  const reason = body.success ? body.data.reason ?? null : null;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return s.status(404).json({ error: 'Korisnik nije pronađen' });
    if (user.role === 'ADMIN') return s.status(403).json({ error: 'Ne možete blokirati administratora' });
    await prisma.user.update({
      where: { id },
      data: { banned: true, bannedReason: reason ?? undefined, updatedAt: new Date() }
    });
    await createAuditLog(adminId, 'USER_BAN', 'USER', id, { reason });
    statsCache = null;
    s.json({ message: 'Korisnik blokiran' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri blokiranju' });
  }
}) as any);

router.post('/users/:id/unban', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  try {
    await prisma.user.update({
      where: { id },
      data: { banned: false, bannedReason: null, updatedAt: new Date() }
    });
    await createAuditLog(adminId, 'USER_UNBAN', 'USER', id, {});
    statsCache = null;
    s.json({ message: 'Korisnik odblokiran' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri odblokiranju' });
  }
}) as any);

router.post('/users/:id/role', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  const body = z.object({ role: z.enum(['USER', 'ADMIN']) }).safeParse(r.body || {});
  if (!body.success) return s.status(400).json({ error: 'role mora biti USER ili ADMIN' });
  try {
    await prisma.user.update({
      where: { id },
      data: { role: body.data.role as any, updatedAt: new Date() }
    });
    await createAuditLog(adminId, 'USER_ROLE', 'USER', id, { role: body.data.role });
    statsCache = null;
    s.json({ message: 'Uloga ažurirana' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri ažuriranju uloge' });
  }
}) as any);

router.delete('/users/:id', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  try {
    const user = await prisma.user.findUnique({ where: { id }, include: { _count: { select: { ads: true } } } });
    if (!user) return s.status(404).json({ error: 'Korisnik nije pronađen' });
    if (user.role === 'ADMIN') return s.status(403).json({ error: 'Ne možete obrisati administratora' });
    await prisma.user.delete({ where: { id } });
    await createAuditLog(adminId, 'USER_DELETE', 'USER', id, { email: user.email });
    statsCache = null;
    s.json({ message: 'Korisnik obrisan' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri brisanju' });
  }
}) as any);

// ----- Ads -----
const adsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().optional(),
  status: z.enum(['NA_CEKANJU', 'AKTIVAN', 'PRODAN', 'ISTEKAO']).optional(),
  category: z.string().optional(),
  isPremium: z.enum(['true', 'false']).optional(),
  hasReports: z.enum(['true', 'false']).optional(),
  possibleDuplicates: z.enum(['true', 'false']).optional()
});

/** GET single ad by slug (any status) – samo admin, za pregled oglasa na čekanju */
router.get('/ads/by-slug/:slug', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const slug = r.params.slug;
  if (!slug) return s.status(400).json({ error: 'Slug je obavezan' });
  try {
    const ad = await prisma.ad.findFirst({
      where: { slug, deletedAt: null },
      include: {
        images: { orderBy: { order: 'asc' as const }, select: { url: true, thumbUrl: true, width: true, height: true, order: true } },
        vlasnik: { select: { id: true, ime: true, telefon: true } },
      },
    });
    if (!ad) return s.status(404).json({ error: 'Oglas nije pronađen' });
    s.json({ ...ad, cijena: Number(ad.cijena) });
  } catch (err) {
    console.error('Admin ad by slug:', err);
    s.status(500).json({ error: 'Greška pri preuzimanju oglasa' });
  }
}) as any);

router.get('/ads', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const parsed = adsQuerySchema.safeParse(r.query);
  if (!parsed.success) return s.status(400).json({ error: 'Nevalidni parametri' });
  const { page, limit, search, status, category, isPremium, hasReports, possibleDuplicates } = parsed.data;
  const skip = (page - 1) * limit;
  const and: Record<string, unknown>[] = [];
  if (possibleDuplicates === 'true') {
    const duplicateRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT a.id FROM "Ad" a
      WHERE a."titleNorm" IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM "Ad" a2
        WHERE a2."vlasnikId" = a."vlasnikId"
        AND a2."titleNorm" = a."titleNorm"
        AND a2.id != a.id
      )
    `;
    const dupIds = duplicateRows.map((r: { id: string }) => r.id);
    if (dupIds.length > 0) and.push({ id: { in: dupIds } });
    else and.push({ id: 'none' }); // no possible duplicates
  }
  if (search?.trim()) {
    and.push({
      OR: [
        { naslov: { contains: search.trim(), mode: 'insensitive' } },
        { id: search.trim() },
        { vlasnik: { email: { contains: search.trim(), mode: 'insensitive' } } }
      ]
    });
  }
  if (status) and.push({ status: status as 'AKTIVAN' | 'PRODAN' | 'ISTEKAO' | 'NA_CEKANJU' });
  if (category) and.push({ kategorija: category });
  if (isPremium === 'true') and.push({ featuredUntil: { gt: new Date() } });
  if (isPremium === 'false') and.push({ OR: [{ featuredUntil: null }, { featuredUntil: { lt: new Date() } }] });
  if (hasReports === 'true') and.push({ reports: { some: {} } });
  if (hasReports === 'false') and.push({ reports: { none: {} } });
  const where = and.length ? { AND: and } : {};
  try {
    const [ads, total] = await Promise.all([
      prisma.ad.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          vlasnik: { select: { id: true, ime: true, email: true } },
          _count: { select: { reports: true } }
        }
      }),
      prisma.ad.count({ where: where as any })
    ]);
    const serialized = ads.map((a: { cijena?: unknown; [k: string]: unknown }) => ({ ...a, cijena: a.cijena != null ? Number(a.cijena) : null }));
    s.json({ ads: serialized, total, page, limit });
  } catch (err) {
    console.error('Admin ads list:', err);
    s.status(500).json({ error: 'Greška pri učitavanju oglasa' });
  }
}) as any);

router.post('/ads/:id/deactivate', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  try {
    await prisma.ad.update({
      where: { id },
      data: { status: AdStatus.ISTEKAO, updatedAt: new Date() }
    });
    await createAuditLog(adminId, 'AD_DEACTIVATE', 'AD', id, {});
    statsCache = null;
    s.json({ message: 'Oglas deaktiviran' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri deaktivaciji' });
  }
}) as any);

router.post('/ads/:id/status', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  const body = z.object({ status: z.enum(['NA_CEKANJU', 'AKTIVAN', 'PRODAN', 'ISTEKAO']) }).safeParse(r.body || {});
  if (!body.success) return s.status(400).json({ error: 'status mora biti NA_CEKANJU, AKTIVAN, PRODAN ili ISTEKAO' });
  try {
    await prisma.ad.update({
      where: { id },
      data: { status: body.data.status as any, updatedAt: new Date() }
    });
    await createAuditLog(adminId, 'AD_STATUS', 'AD', id, { status: body.data.status });
    statsCache = null;
    if (body.data.status === 'AKTIVAN') {
      notifySavedSearchesForAd(id).catch((err) => console.error('[admin] notifySavedSearchesForAd', err));
    }
    s.json({ message: 'Status ažuriran' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri ažuriranju statusa' });
  }
}) as any);

const featureSchema = z.object({
  plan: z.enum(['7', '14', '30']).optional().nullable(),
  featuredUntil: z.string().datetime().optional(),
  removePromo: z.boolean().optional()
});

router.post('/ads/:id/feature', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  const body = featureSchema.safeParse(r.body || {});
  if (!body.success) return s.status(400).json({ error: 'plan (7|14|30), featuredUntil (ISO) ili removePromo: true' });
  let featuredUntil: Date | null = null;
  if (body.data?.removePromo) {
    featuredUntil = null;
  } else if (body.data?.plan) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(body.data.plan, 10));
    featuredUntil = d;
  } else if (body.data?.featuredUntil) {
    featuredUntil = new Date(body.data.featuredUntil);
    if (isNaN(featuredUntil.getTime())) return s.status(400).json({ error: 'Nevalidan datum' });
  } else {
    return s.status(400).json({ error: 'plan (7|14|30), featuredUntil ili removePromo obavezno' });
  }
  try {
    await prisma.ad.update({
      where: { id },
      data: { featuredUntil: featuredUntil === null ? null : (featuredUntil ?? undefined), updatedAt: new Date() }
    });
    await createAuditLog(adminId, 'AD_FEATURE', 'AD', id, { featuredUntil: featuredUntil?.toISOString() ?? null, removePromo: !!body.data?.removePromo });
    statsCache = null;
    s.json({ message: featuredUntil ? 'Promocija postavljena' : 'Promocija uklonjena', featuredUntil });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri postavljanju promocije' });
  }
}) as any);

router.delete('/ads/:id', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  try {
    await prisma.ad.delete({ where: { id } });
    await createAuditLog(adminId, 'AD_DELETE', 'AD', id, {});
    statsCache = null;
    s.json({ message: 'Oglas obrisan' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri brisanju oglasa' });
  }
}) as any);

// ----- Reports -----
const reportsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z.enum(['open', 'closed']).optional()
});

router.get('/reports', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const parsed = reportsQuerySchema.safeParse(r.query);
  if (!parsed.success) return s.status(400).json({ error: 'Nevalidni parametri' });
  const { page, limit, status } = parsed.data;
  const skip = (page - 1) * limit;
  const where: any = {};
  if (status) where.status = status;
  try {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ad: { select: { id: true, naslov: true, slug: true, status: true, vlasnikId: true, vlasnik: { select: { ime: true, email: true } } } },
          reporter: { select: { id: true, ime: true, email: true } }
        }
      }),
      prisma.report.count({ where })
    ]);
    s.json({ reports, total, page, limit });
  } catch (err) {
    console.error('Admin reports:', err);
    s.status(500).json({ error: 'Greška pri učitavanju prijava' });
  }
}) as any);

const resolveSchema = z.object({
  action: z.enum(['dismiss', 'actionTaken']).optional(),
  note: z.string().optional()
});

router.post('/reports/:id/resolve', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const adminId = getAdminId(r);
  const { id } = r.params;
  const body = resolveSchema.safeParse(r.body || {});
  const action = body.success ? (body.data.action ?? 'dismiss') : 'dismiss';
  const note = body.success ? body.data.note : undefined;
  try {
    const report = await prisma.report.findUnique({ where: { id }, include: { ad: true } });
    if (!report) return s.status(404).json({ error: 'Prijava nije pronađena' });
    await prisma.report.update({
      where: { id },
      data: { status: ReportStatus.closed, resolvedAt: new Date() }
    });
    await createAuditLog(adminId, 'REPORT_RESOLVE', 'REPORT', id, { reportId: id, adId: report.adId, action, note });
    if (report.reporterUserId) {
      await createNotification(
        report.reporterUserId,
        'report_resolved',
        'Prijava riješena',
        'Vaša prijava oglasa je pregledana i riješena.',
        report.ad ? `/oglas/${report.ad.slug}` : undefined
      );
    }
    s.json({ message: 'Prijava označena kao riješena' });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri rješavanju prijave' });
  }
}) as any);

// ----- Payments -----
const paymentsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['pending', 'succeeded', 'failed', 'refunded']).optional()
});

router.get('/payments', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const parsed = paymentsQuerySchema.safeParse(r.query);
  if (!parsed.success) return s.status(400).json({ error: 'Nevalidni parametri' });
  const { page, limit, status } = parsed.data;
  const skip = (page - 1) * limit;
  const where: { status?: string } = {};
  if (status) where.status = status;
  try {
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, ime: true, email: true } },
          ad: { select: { id: true, naslov: true, slug: true } }
        }
      }),
      prisma.payment.count({ where })
    ]);
    s.json({
      payments: payments.map((p: { id: string; userId: string; user: { id: string; ime: string; email: string }; adId: string | null; ad: { id: string; naslov: string; slug: string } | null; amount: number; currency: string; status: string; planDays: number | null; createdAt: Date }) => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        adId: p.adId,
        ad: p.ad,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        planDays: p.planDays,
        createdAt: p.createdAt.toISOString()
      })),
      total,
      page,
      limit
    });
  } catch (err) {
    console.error('Admin payments:', err);
    s.status(500).json({ error: 'Greška pri učitavanju plaćanja' });
  }
}) as any);

router.get('/payments/totals', authenticate as any, requireAdmin as any, (async (_req: Request, res: Response) => {
  const s = res as any;
  try {
    const [revenueResult, countResult] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true }
      }),
      prisma.payment.count({ where: { status: 'succeeded' } })
    ]);
    const totalCents = revenueResult._sum?.amount ?? 0;
    s.json({ total: totalCents / 100, totalCents, count: countResult });
  } catch (err) {
    s.status(500).json({ error: 'Greška' });
  }
}) as any);

// ----- Motorna vozila: Make / Model (admin CRUD) -----
const VALID_VEHICLE_TYPES = ['automobili', 'motocikli', 'kamioni', 'traktori', 'cetvorotockasi', 'kombi', 'autobusi', 'prikolice', 'kamperi'];

router.get('/vehicle-makes', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  try {
    const vehicleType = r.query?.vehicleType as string | undefined;
    const where = vehicleType && VALID_VEHICLE_TYPES.includes(vehicleType) ? { vehicleType } : {};
    const makes = await prisma.vehicleMake.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { models: true } } }
    });
    s.json({ makes });
  } catch (err) {
    console.error('Admin vehicle-makes:', err);
    s.status(500).json({ error: 'Greška' });
  }
}) as any);

const makeSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  vehicleType: z.string().refine((v) => VALID_VEHICLE_TYPES.includes(v), { message: 'Neispravan vehicleType' }),
  order: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional()
});
router.post('/vehicle-makes', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  try {
    const body = makeSchema.parse(r.body);
    const slug = (body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).slice(0, 80);
    const make = await prisma.vehicleMake.create({
      data: { name: body.name, slug, vehicleType: body.vehicleType, order: body.order ?? 0, isPrimary: body.isPrimary ?? false }
    });
    await createAuditLog(getAdminId(r), 'CREATE', 'VehicleMake', make.id, { name: make.name, vehicleType: make.vehicleType });
    s.status(201).json(make);
  } catch (err) {
    if (err instanceof z.ZodError) s.status(400).json({ error: err.issues });
    else { console.error('Admin vehicle-makes create:', err); s.status(500).json({ error: 'Greška' }); }
  }
}) as any);

router.patch('/vehicle-makes/:id', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const id = r.params.id;
  try {
    const body = z.object({ name: z.string().min(1).optional(), slug: z.string().min(1).optional(), order: z.number().int().min(0).optional(), isPrimary: z.boolean().optional() }).partial().parse(r.body);
    const make = await prisma.vehicleMake.update({ where: { id }, data: body });
    await createAuditLog(getAdminId(r), 'UPDATE', 'VehicleMake', id, body);
    s.json(make);
  } catch (err) {
    if (err instanceof z.ZodError) s.status(400).json({ error: err.issues });
    else { console.error('Admin vehicle-makes patch:', err); s.status(500).json({ error: 'Greška' }); }
  }
}) as any);

router.get('/vehicle-makes/:makeId/models', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const s = res as any;
  const makeId = (req as any).params.makeId;
  try {
    const models = await prisma.vehicleModel.findMany({
      where: { makeId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }]
    });
    s.json({ models });
  } catch (err) {
    s.status(500).json({ error: 'Greška' });
  }
}) as any);

const modelSchema = z.object({ name: z.string().min(1), slug: z.string().min(1).optional(), isPrimary: z.boolean().optional() });
router.post('/vehicle-makes/:makeId/models', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const makeId = r.params.makeId;
  try {
    const body = modelSchema.parse(r.body);
    const make = await prisma.vehicleMake.findUnique({ where: { id: makeId }, select: { vehicleType: true } });
    if (!make) return s.status(404).json({ error: 'Make nije pronađen' });
    const slug = (body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).slice(0, 80);
    const model = await prisma.vehicleModel.create({
      data: { makeId, name: body.name, slug, vehicleType: make.vehicleType, isPrimary: body.isPrimary ?? false }
    });
    await createAuditLog(getAdminId(r), 'CREATE', 'VehicleModel', model.id, { makeId, name: model.name });
    s.status(201).json(model);
  } catch (err) {
    if (err instanceof z.ZodError) s.status(400).json({ error: err.issues });
    else { console.error('Admin vehicle-models create:', err); s.status(500).json({ error: 'Greška' }); }
  }
}) as any);

router.patch('/vehicle-models/:id', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const id = r.params.id;
  try {
    const body = z.object({ name: z.string().min(1).optional(), slug: z.string().min(1).optional(), isPrimary: z.boolean().optional() }).partial().parse(r.body);
    const model = await prisma.vehicleModel.update({ where: { id }, data: body });
    await createAuditLog(getAdminId(r), 'UPDATE', 'VehicleModel', id, body);
    s.json(model);
  } catch (err) {
    if (err instanceof z.ZodError) s.status(400).json({ error: err.issues });
    else { console.error('Admin vehicle-models patch:', err); s.status(500).json({ error: 'Greška' }); }
  }
}) as any);

router.delete('/vehicle-models/:id', authenticate as any, requireAdmin as any, (async (req: Request, res: Response) => {
  const s = res as any;
  const id = (req as any).params.id;
  try {
    await prisma.vehicleModel.delete({ where: { id } });
    s.status(204).end();
  } catch (err) {
    s.status(500).json({ error: 'Greška' });
  }
}) as any);

export default router;
