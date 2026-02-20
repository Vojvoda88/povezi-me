
import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import sharp from 'sharp';
import * as PrismaClientModule from '@prisma/client';
import prisma from '../lib/prisma';
import { getSupabase, BUCKET_ADS } from '../lib/supabase';
import { extractStoragePath, cleanupTmpUploads } from '../lib/storage';
import { sanitizeHTML } from '../lib/sanitize';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { verifyCaptcha } from '../lib/captcha';
import { z } from 'zod';
import {
  MOTORNA_VOZILA_CATEGORY_ID,
  MOTORNA_VOZILA_SUBCATEGORIES,
  getAllowedFilterKeysForSubcategory,
  getSpecFilterKeys,
  type VehicleSubcategoryId,
} from '../config/vehicleTaxonomy';
import { runAdLifecycleCheck } from '../lib/adLifecycle';
import { computeDedupeKey, normalizeTitle } from '../lib/dedupe';
import { createNotification } from '../lib/notifications';
import { computeRankingScore } from '../lib/ranking';
import { viewThrottleKey, canIncrementAndRecord } from '../lib/viewThrottleDb';

const AdStatus = (PrismaClientModule as any).AdStatus;
const Prisma = (PrismaClientModule as any).Prisma;

const router = Router();

const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { error: 'Previše prijava. Pokušajte ponovo sutra.' }
});

const createAdLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { error: 'Previše objava. Pokušajte ponovo za 10 minuta.' }
});
const reportBodySchema = z.object({
  reason: z.string().min(3).max(500),
  details: z.string().max(2000).optional(),
  captchaToken: z.string().optional()
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('Dozvoljeni formati: JPEG, PNG, WebP.'));
    }
    cb(null, true);
  }
});

const imageInputSchema = z.object({
  url: z.string().min(1),
  thumbUrl: z.string().min(1).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const createAdSchema = z.object({
  naslov: z.string().min(3),
  opis: z.string().min(10),
  cijena: z.union([z.number(), z.string()]).transform(v => (typeof v === 'string' ? parseFloat(v) : v)).pipe(z.number().min(0)),
  kategorija: z.string(),
  lokacija: z.string(),
  potkategorija: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  vehicleSpecs: z.record(z.unknown()).optional(),
  images: z.array(imageInputSchema).optional(),
  tipOglasa: z.enum(['prodajem', 'trazim']).optional(),
  details: z.record(z.unknown()).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable()
});

const updateAdSchema = z.object({
  status: z.enum(['AKTIVAN', 'PRODAN', 'ISTEKAO']).optional(),
  naslov: z.string().min(3).optional(),
  opis: z.string().min(10).optional(),
  cijena: z
    .union([z.number(), z.string()])
    .optional()
    .refine((v) => {
      if (v === undefined || v === null) return true;
      const n = typeof v === 'string' ? parseFloat(v) : Number(v);
      return !Number.isNaN(n) && n >= 0;
    }, { message: 'Cijena ne može biti negativna' }),
  lokacija: z.string().optional(),
  potkategorija: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  vehicleSpecs: z.record(z.unknown()).optional(),
  tipOglasa: z.enum(['prodajem', 'trazim']).optional(),
  details: z.record(z.unknown()).optional(),
  images: z.array(imageInputSchema).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable()
});

/**
 * Public Feed
 * 1. Lazy Expiration: Moves ads with past expiresAt to ISTEKAO status.
 * 2. Single-query server-side pagination with index-friendly sort (featuredUntil DESC nulls last, createdAt DESC).
 * 3. Minimal payload: select only card fields + 1 thumbnail per ad.
 */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const VALID_SUBCATEGORIES_SET = new Set(MOTORNA_VOZILA_SUBCATEGORIES.map((s) => s.id));

const LISTING_SELECT = {
  id: true,
  slug: true,
  naslov: true,
  cijena: true,
  lokacija: true,
  lat: true,
  lng: true,
  createdAt: true,
  featuredUntil: true,
  tipOglasa: true,
  kategorija: true,
  potkategorija: true,
  pogledi: true,
  details: true,
  vlasnikId: true,
  images: {
    take: 1,
    orderBy: { order: 'asc' } as const,
    select: { url: true, thumbUrl: true, width: true, height: true },
  },
  _count: { select: { favoritedBy: true } },
} as const;

function buildVehicleWhere(
  query: Record<string, string | undefined>,
  subcategory: VehicleSubcategoryId
): Record<string, unknown>[] {
  const allowed = getAllowedFilterKeysForSubcategory(subcategory);
  const and: Record<string, unknown>[] = [];

  const make = query.make || query.marka;
  if (make) and.push({ make: { equals: make } });
  const model = query.model;
  if (model) and.push({ model: { equals: model } });

  const priceMin = query.priceMin ? Number(query.priceMin) : NaN;
  const priceMax = query.priceMax ? Number(query.priceMax) : NaN;
  if (!Number.isNaN(priceMin) && priceMin > 0) and.push({ cijena: { gte: priceMin } });
  if (!Number.isNaN(priceMax) && priceMax > 0) and.push({ cijena: { lte: priceMax } });

  const specKeys = getSpecFilterKeys(subcategory);
  const vehicleSpecs = query.vehicleSpecs
    ? (typeof query.vehicleSpecs === 'string' ? JSON.parse(query.vehicleSpecs) : query.vehicleSpecs) as Record<string, unknown>
    : {};

  const location = query.lokacija || query.location;
  if (location) and.push({ lokacija: location });
  const fuel = query.gorivo || query.fuel;
  if (fuel) and.push({ vehicleSpecs: { path: ['gorivo'], equals: fuel } });
  const transmission = query.mjenjac || query.transmission;
  if (transmission) and.push({ vehicleSpecs: { path: ['mjenjac'], equals: transmission } });
  const stanje = query.stanje;
  if (stanje) and.push({ vehicleSpecs: { path: ['stanje'], equals: stanje } });

  for (const key of specKeys) {
    const value = vehicleSpecs[key] ?? query[key];
    if (value === undefined || value === '') continue;
    const strVal = typeof value === 'number' ? String(value) : String(value);
    and.push({ vehicleSpecs: { path: [key], equals: strVal } });
  }
  return and;
}

router.get('/', (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const q = (r.query.q != null && typeof r.query.q === 'string') ? String(r.query.q).trim() : '';
  const kategorija = r.query.kategorija as string | undefined;
  const subcategory = r.query.subcategory as string | undefined;
  const lokacija = r.query.lokacija as string | undefined;
  const page = Math.max(1, parseInt(String(r.query.page), 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(r.query.limit), 10) || DEFAULT_LIMIT));

  const where: Record<string, unknown> = {
    status: AdStatus.AKTIVAN,
    deletedAt: null,
    vlasnik: { shadowBanned: false },
  };
  if (q) {
    where.OR = [
      { naslov: { contains: q, mode: 'insensitive' } },
      { opis: { contains: q, mode: 'insensitive' } }
    ];
  }
  if (kategorija) where.kategorija = kategorija;
  if (lokacija) where.lokacija = lokacija;

  const isMotornaVozila = kategorija === MOTORNA_VOZILA_CATEGORY_ID;
  if (isMotornaVozila && subcategory && VALID_SUBCATEGORIES_SET.has(subcategory as VehicleSubcategoryId)) {
    where.potkategorija = subcategory;
    const vehicleAnd = buildVehicleWhere(r.query as Record<string, string | undefined>, subcategory as VehicleSubcategoryId);
    if (vehicleAnd.length) where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...vehicleAnd];
  }

  const sort = r.query.sort as string | undefined;
  const useRankingSort = !sort || sort !== 'price_asc' && sort !== 'price_desc';
  const secondarySort = sort === 'price_asc'
    ? ({ cijena: 'asc' as const })
    : sort === 'price_desc'
      ? ({ cijena: 'desc' as const })
      : ({ createdAt: 'desc' as const });
  const orderBy = [
    { featuredUntil: { sort: 'desc' as const, nulls: 'last' as const } },
    secondarySort,
  ];

  try {
    const now = new Date();
    runAdLifecycleCheck().catch(() => {});
    await prisma.ad.updateMany({
      where: { status: AdStatus.AKTIVAN, deletedAt: null, expiresAt: { lt: now } },
      data: { status: AdStatus.ISTEKAO }
    });

    let ads: unknown[] = [];

    try {
      if (useRankingSort && page === 1) {
        const [premiumRaw, normalRaw] = await Promise.all([
          prisma.ad.findMany({
            where: { ...where, featuredUntil: { gt: now } },
            select: LISTING_SELECT,
            orderBy: { createdAt: 'desc' as const },
            take: 1000,
          }),
          prisma.ad.findMany({
            where: {
              ...where,
              OR: [{ featuredUntil: { lte: now } }, { featuredUntil: null }],
            },
            select: LISTING_SELECT,
            orderBy: { createdAt: 'desc' as const },
            take: 1000,
          }),
        ]);
        const raw = [...premiumRaw, ...normalRaw];
        const withScore = raw.map((ad: { featuredUntil: Date | null; pogledi: number; _count?: { favoritedBy: number }; createdAt: Date | string }) => ({
          ad,
          premiumActive: ad.featuredUntil != null && new Date(ad.featuredUntil) > now,
          score: computeRankingScore({
            premiumActive: ad.featuredUntil != null && new Date(ad.featuredUntil) > now,
            views: ad.pogledi ?? 0,
            likes: ad._count?.favoritedBy ?? 0,
            createdAt: ad.createdAt,
          }),
        }));
        type Scored = { ad: { createdAt: Date | string }; premiumActive: boolean; score: number };
        withScore.sort((a: Scored, b: Scored) => {
          if (a.premiumActive !== b.premiumActive) return a.premiumActive ? -1 : 1;
          if (b.score !== a.score) return b.score - a.score;
          return new Date(b.ad.createdAt).getTime() - new Date(a.ad.createdAt).getTime();
        });
        ads = withScore.slice(0, limit).map((x: Scored) => serializeListingAd(x.ad));
      } else {
        const result = await prisma.ad.findMany({
          where,
          select: LISTING_SELECT,
          orderBy: orderBy as never,
          skip: (page - 1) * limit,
          take: limit,
        });
        ads = result.map(serializeListingAd);
      }
    } catch (fetchErr) {
      // Fallback: ako images/select dio pravi problem (npr. zbog schema mismatch), pokušaj minimalni SELECT bez images.
      const fallbackSelect = {
        id: true,
        slug: true,
        naslov: true,
        cijena: true,
        lokacija: true,
        createdAt: true,
        featuredUntil: true,
        tipOglasa: true,
        kategorija: true,
        potkategorija: true,
        pogledi: true,
        details: true,
        vlasnikId: true,
      } as const;

      const fallback = await prisma.ad.findMany({
        where,
        select: fallbackSelect,
        orderBy: orderBy as never,
        skip: (page - 1) * limit,
        take: limit,
      });
      ads = fallback.map((a: any) => ({
        id: a.id,
        slug: a.slug,
        naslov: a.naslov,
        cijena: Number(a.cijena),
        lokacija: a.lokacija,
        lat: null,
        lng: null,
        createdAt: a.createdAt?.toISOString?.() ?? a.createdAt ?? null,
        featuredUntil: a.featuredUntil?.toISOString?.() ?? a.featuredUntil ?? null,
        tipOglasa: a.tipOglasa ?? null,
        kategorija: a.kategorija,
        potkategorija: a.potkategorija ?? null,
        pogledi: a.pogledi ?? 0,
        details: a.details ?? null,
        vlasnikId: a.vlasnikId,
        images: [],
        _count: { favoritedBy: 0 },
      }));
    }

    const total = await prisma.ad.count({ where });
    return s.json({ ads, total, page, limit });
  } catch (err) {
    const requestId = (req as any).requestId;
    const payload: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      event: 'ads_list_error',
      requestId,
      message: err instanceof Error ? err.message : String(err),
    };
    // Prisma error code ako postoji
    if (err && typeof err === 'object' && (err as any).code) {
      payload.code = (err as any).code;
    }
    if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
      payload.stack = err.stack;
    }
    console.error(JSON.stringify(payload));
    s.status(500).json({
      error: 'Greška pri preuzimanju oglasa',
      requestId,
    });
  }
}) as any);

/**
 * POST upload jedne slike za oglas (Supabase Storage)
 * Zahtijeva auth. Body: multipart/form-data, polje "image".
 */
router.post('/upload', authenticate as any, upload.single('image'), (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  if (!r.user?.userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  const file = r.file;
  if (!file || !file.buffer) return s.status(400).json({ error: 'Nema datoteke. Pošaljite polje "image".' });

  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(file.buffer);
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!detected || !allowedMimes.includes(detected.mime)) {
    return s.status(400).json({ error: 'Neispravan format slike. Dozvoljeni: JPEG, PNG, WebP.' });
  }

  // TEST_MODE: tokom E2E testova ne oslanjamo se na stvarni Supabase upload.
  if (process.env.TEST_MODE === 'true') {
    const base = `http://localhost/test-uploads/${r.user.userId}/${crypto.randomUUID()}`;
    const ext = 'webp';
    return s.status(200).json({
      url: `${base}_main.${ext}`,
      thumbUrl: `${base}_thumb.${ext}`,
      width: 1600,
      height: 900,
    });
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return s.status(503).json({
        error: 'Upload slika nije konfigurisan. Postavite SUPABASE_URL i SUPABASE_SERVICE_KEY u .env.',
      });
    }

    // Glavna verzija (max 1600px, WebP ~80)
    const mainSharp = sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 });
    const thumbSharp = sharp(file.buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 });

    const [mainBuffer, thumbBuffer] = await Promise.all([
      mainSharp.toBuffer(),
      thumbSharp.toBuffer(),
    ]);

    let width: number | undefined;
    let height: number | undefined;
    try {
      const meta = await sharp(mainBuffer).metadata();
      width = meta.width ?? undefined;
      height = meta.height ?? undefined;
    } catch {
      width = undefined;
      height = undefined;
    }

    const baseName = crypto.randomUUID();
    const basePath = `ads/${r.user.userId}/tmp/${baseName}`;
    const mainPath = `${basePath}_main.webp`;
    const thumbPath = `${basePath}_thumb.webp`;

    const CACHE_MAX_AGE = 86400; // 24h u sekundama – browser i CDN cache
    const [{ data: mainData, error: mainErr }, { data: thumbData, error: thumbErr }] = await Promise.all([
      supabase.storage
        .from(BUCKET_ADS)
        .upload(mainPath, mainBuffer, { contentType: 'image/webp', upsert: false, cacheControl: String(CACHE_MAX_AGE) }),
      supabase.storage
        .from(BUCKET_ADS)
        .upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: false, cacheControl: String(CACHE_MAX_AGE) }),
    ]);

    if (mainErr || thumbErr || !mainData || !thumbData) {
      console.error('Supabase storage upload error:', mainErr || thumbErr);
      return s.status(500).json({ error: 'Greška pri uploadu slike. Pokušajte ponovo.' });
    }

    const { data: mainUrlData } = supabase.storage.from(BUCKET_ADS).getPublicUrl(mainData.path);
    const { data: thumbUrlData } = supabase.storage.from(BUCKET_ADS).getPublicUrl(thumbData.path);

    s.status(200).json({
      url: mainUrlData.publicUrl,
      thumbUrl: thumbUrlData.publicUrl,
      width,
      height,
    });
  } catch (err) {
    console.error('Upload error:', err);
    s.status(500).json({ error: 'Greška pri uploadu slike.' });
  }
}) as any);

router.use((err: any, _req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return (res as any).status(400).json({ error: 'Slika je prevelika. Maksimalno 5 MB.' });
  }
  if (err.message && err.message.includes('Dozvoljeni formati')) {
    return (res as any).status(400).json({ error: err.message });
  }
  next(err);
});

/**
 * GET my ads (za prijavljenog korisnika) – minimal payload, indexed by vlasnikId+createdAt
 */
router.get('/mine', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  try {
    runAdLifecycleCheck().catch(() => {});
    const ads = await prisma.ad.findMany({
      where: { vlasnikId: userId, deletedAt: null },
      select: LISTING_SELECT,
      orderBy: { createdAt: 'desc' }
    });
    s.json(ads);
  } catch (err) {
    s.status(500).json({ error: 'Greška pri preuzimanju oglasa' });
  }
}) as any);

/**
 * GET single ad by id (samo vlasnik – za uređivanje)
 */
router.get('/my/:id', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const adId = r.params.id;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  if (!adId) return s.status(400).json({ error: 'ID oglasa je obavezan' });
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      include: { images: { orderBy: { order: 'asc' } }, vlasnik: { select: { id: true, ime: true, telefon: true } } }
    });
    if (!ad) return s.status(404).json({ error: 'Oglas nije pronađen' });
    if (ad.vlasnikId !== userId) return s.status(403).json({ error: 'Niste vlasnik ovog oglasa' });
    s.json(ad);
  } catch (err) {
    s.status(500).json({ error: 'Greška pri preuzimanju oglasa' });
  }
}) as any);

/**
 * PATCH update own ad (status, naslov, opis, slike, itd.)
 */
router.patch('/my/:id', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const adId = r.params.id;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  if (!adId) return s.status(400).json({ error: 'ID oglasa je obavezan' });
  try {
    const ad = await prisma.ad.findUnique({ where: { id: adId }, include: { images: true } });
    if (!ad) return s.status(404).json({ error: 'Oglas nije pronađen' });
    if (ad.vlasnikId !== userId) return s.status(403).json({ error: 'Niste vlasnik ovog oglasa' });

    const validated = updateAdSchema.parse(r.body);
    const data: Record<string, unknown> = {};

    if (validated.status !== undefined) {
      if (ad.status === 'NA_CEKANJU' && validated.status === 'AKTIVAN') {
        return s.status(403).json({ error: 'Samo administrator može odobriti oglas. Oglas je na čekanju.' });
      }
      data.status = validated.status as any;
    }
    if (validated.naslov !== undefined) data.naslov = sanitizeHTML(validated.naslov);
    if (validated.opis !== undefined) data.opis = sanitizeHTML(validated.opis);
    if (validated.cijena !== undefined) data.cijena = new Prisma.Decimal(Number(validated.cijena));
    if (validated.lokacija !== undefined) data.lokacija = validated.lokacija;
    if (validated.lat !== undefined) data.lat = validated.lat;
    if (validated.lng !== undefined) data.lng = validated.lng;
    if (validated.potkategorija !== undefined) data.potkategorija = validated.potkategorija;
    if (validated.tipOglasa !== undefined) data.tipOglasa = validated.tipOglasa;
    if (validated.details !== undefined) {
      data.details = typeof validated.details === 'object' && validated.details !== null && !Array.isArray(validated.details)
        ? (JSON.parse(JSON.stringify(validated.details)) as Record<string, unknown>)
        : undefined;
    }
    if (validated.make !== undefined) data.make = validated.make;
    if (validated.model !== undefined) data.model = validated.model;
    if (validated.vehicleSpecs !== undefined) {
      data.vehicleSpecs = typeof validated.vehicleSpecs === 'object' && validated.vehicleSpecs !== null && !Array.isArray(validated.vehicleSpecs)
        ? (JSON.parse(JSON.stringify(validated.vehicleSpecs)) as Record<string, unknown>)
        : undefined;
    }

    const hasContentChanges =
      validated.naslov !== undefined ||
      validated.opis !== undefined ||
      validated.images !== undefined ||
      validated.details !== undefined ||
      validated.cijena !== undefined ||
      validated.lokacija !== undefined ||
      validated.lat !== undefined ||
      validated.lng !== undefined ||
      validated.tipOglasa !== undefined ||
      validated.make !== undefined ||
      validated.model !== undefined ||
      validated.vehicleSpecs !== undefined ||
      validated.potkategorija !== undefined;
    if (
      validated.status === undefined &&
      hasContentChanges &&
      ad.status === AdStatus.AKTIVAN
    ) {
      (data as Record<string, unknown>).status = AdStatus.NA_CEKANJU;
    }

    if (validated.images !== undefined) {
      const existing = ad.images as { id: string; url: string; thumbUrl?: string | null }[];
      const newUrls = new Set(validated.images.map((img) => String(img.url)));

      const removed = existing.filter((img) => !newUrls.has(img.url));

      const supabase = getSupabase();
      if (supabase && removed.length) {
        const pathsToDelete: string[] = [];
        for (const img of removed) {
          const mainPath = extractStoragePath(img.url, BUCKET_ADS);
          if (mainPath) pathsToDelete.push(mainPath);
          if (img.thumbUrl) {
            const thumbPath = extractStoragePath(img.thumbUrl, BUCKET_ADS);
            if (thumbPath) pathsToDelete.push(thumbPath);
          }
        }
        if (pathsToDelete.length) {
          try {
            await supabase.storage.from(BUCKET_ADS).remove(pathsToDelete);
          } catch (err) {
            console.error(
              JSON.stringify({
                timestamp: new Date().toISOString(),
                requestId: (req as any).requestId,
                event: 'ad_image_diff_delete_error',
                adId,
                paths: pathsToDelete,
                error: err instanceof Error ? err.message : String(err),
              })
            );
          }
        }
      }

      await prisma.adImage.deleteMany({ where: { adId } });
      if (validated.images.length > 0) {
        await prisma.adImage.createMany({
          data: validated.images.map((img, index) => ({
            adId,
            url: String(img.url),
            thumbUrl: img.thumbUrl ? String(img.thumbUrl) : null,
            width: img.width ?? null,
            height: img.height ?? null,
            order: index,
          })),
        });
      }
    }

    (data as Record<string, unknown>).lastActivityAt = new Date();
    const updated = await prisma.ad.update({
      where: { id: adId },
      data: data as any,
      include: { images: { orderBy: { order: 'asc' } }, vlasnik: { select: { id: true, ime: true, telefon: true } } }
    });

    if ((data as Record<string, unknown>).status === AdStatus.NA_CEKANJU) {
      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        const link = `/admin/pending`;
        const naslov = 'Izmjene oglasa na čekanju';
        const poruka = (updated.naslov || ad.naslov || 'Oglas')?.slice(0, 80);
        for (const adm of admins) {
          await createNotification(adm.id, 'ADMIN_PENDING_AD', naslov, poruka, link, adId, Date.now());
        }
      } catch (notifErr) {
        console.error('Admin pending-edit notification:', notifErr);
      }
    }

    s.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      s.status(400).json({ error: err.issues });
    } else {
      console.error('Ad update error:', err);
      s.status(500).json({ error: 'Greška pri ažuriranju oglasa' });
    }
  }
}) as any);

/**
 * DELETE own ad
 */
router.delete('/my/:id', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const adId = r.params.id;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  if (!adId) return s.status(400).json({ error: 'ID oglasa je obavezan' });
  try {
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) return s.status(404).json({ error: 'Oglas nije pronađen' });
    if (ad.vlasnikId !== userId) return s.status(403).json({ error: 'Niste vlasnik ovog oglasa' });
    await prisma.ad.delete({ where: { id: adId } });
    s.status(204).end();
  } catch (err) {
    s.status(500).json({ error: 'Greška pri brisanju oglasa' });
  }
}) as any);

/**
 * POST report ad – prijavi oglas (auth obavezan, rate limit, jedna prijava po useru po oglasu)
 */
router.post('/:id/report', reportLimiter as any, authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const adId = r.params.id;
  if (!userId) return s.status(401).json({ error: 'Morate biti prijavljeni da biste prijavili oglas' });
  if (!adId) return s.status(400).json({ error: 'ID oglasa je obavezan' });
  try {
    const parsed = reportBodySchema.safeParse(r.body);
    if (!parsed.success) {
      s.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Neispravan razlog (min 3 znaka)' });
      return;
    }
    const { reason, details, captchaToken } = parsed.data;
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const valid = await verifyCaptcha(captchaToken);
      if (!valid) {
        s.status(400).json({ error: 'CAPTCHA validacija nije uspjela. Pokušajte ponovo.' });
        return;
      }
    }
    const ad = await prisma.ad.findUnique({ where: { id: adId } });
    if (!ad) return s.status(404).json({ error: 'Oglas nije pronađen' });
    const existing = await prisma.report.findFirst({
      where: { adId, reporterUserId: userId }
    });
    if (existing) {
      s.status(400).json({ error: 'Već ste prijavili ovaj oglas' });
      return;
    }
    await prisma.report.create({
      data: {
        adId,
        reporterUserId: userId,
        reason: reason.trim(),
        details: details?.trim() || undefined
      }
    });
    s.status(201).json({ message: 'Prijava je zabilježena. Hvala.' });
  } catch (err) {
    console.error('Report ad error:', err);
    s.status(500).json({ error: 'Greška pri prijavi oglasa' });
  }
}) as any);

/**
 * POST /api/ads/:id/extend – 1-klik produženje (bump lastActivityAt), samo vlasnik
 */
router.post('/:id/extend', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const adId = r.params.id;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  if (!adId) return s.status(400).json({ error: 'ID oglasa je obavezan' });
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true, vlasnikId: true, deletedAt: true, status: true },
    });
    if (!ad) return s.status(404).json({ error: 'Oglas nije pronađen' });
    if (ad.vlasnikId !== userId) return s.status(403).json({ error: 'Niste vlasnik ovog oglasa' });
    if (ad.deletedAt) return s.status(400).json({ error: 'Oglas je već obrisan.' });
    if (ad.status !== 'AKTIVAN') return s.status(400).json({ error: 'Samo aktivni oglasi se mogu produžiti.' });
    const now = new Date();
    await prisma.ad.update({
      where: { id: adId },
      data: { lastActivityAt: now, updatedAt: now },
    });
    s.json({ ok: true, message: 'Oglas produžen. Nova aktivnost ažurirana.' });
  } catch (err) {
    console.error('Extend ad error:', err);
    s.status(500).json({ error: 'Greška pri produženju oglasa.' });
  }
}) as any);

/** Sigurna konverzija u number – Prisma Decimal i edge cases. */
function safeNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = Number(typeof v === 'object' && v !== null && 'toString' in v ? (v as any).toString() : v);
  return Number.isNaN(n) ? 0 : n;
}

/** Sigurna konverzija datuma u ISO string. */
function safeDate(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  return null;
}

/** Serijalizuje listing ad (LISTING_SELECT) za JSON. */
function serializeListingAd(ad: any) {
  try {
    const img = Array.isArray(ad?.images) && ad.images[0] ? ad.images[0] : null;
    return {
      id: ad?.id ?? '',
      slug: ad?.slug ?? '',
      naslov: ad?.naslov ?? '',
      cijena: safeNum(ad?.cijena),
      lokacija: ad?.lokacija ?? '',
      lat: ad?.lat ?? null,
      lng: ad?.lng ?? null,
      createdAt: safeDate(ad?.createdAt),
      featuredUntil: safeDate(ad?.featuredUntil),
      tipOglasa: ad?.tipOglasa ?? null,
      kategorija: ad?.kategorija ?? '',
      potkategorija: ad?.potkategorija ?? null,
      pogledi: safeNum(ad?.pogledi),
      details: ad?.details ?? null,
      vlasnikId: ad?.vlasnikId ?? '',
      images: img ? [{ url: img.url ?? '', thumbUrl: img.thumbUrl ?? null, width: img.width ?? null, height: img.height ?? null }] : [],
      _count: ad?._count ?? { favoritedBy: 0 },
    };
  } catch (e) {
    console.error('serializeListingAd error:', e);
    return { id: ad?.id, slug: ad?.slug, naslov: ad?.naslov ?? '', cijena: 0, lokacija: '', images: [], _count: { favoritedBy: 0 } } as any;
  }
}

/**
 * GET similar ads by slug – ista kategorija/potkategorija, cijena ±30%, max 8
 */
router.get('/similar/:slug', (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const slug = r.params.slug;
  if (!slug) return s.status(400).json({ error: 'Slug je obavezan' });
  try {
    const source = await prisma.ad.findFirst({
      where: { slug, status: AdStatus.AKTIVAN, deletedAt: null },
      select: { id: true, kategorija: true, potkategorija: true, cijena: true },
    });
    if (!source) return s.status(404).json({ error: 'Oglas nije pronađen' });
    const price = safeNum(source.cijena) || 1;
    const priceMin = Math.max(0, Math.floor(price * 0.7));
    const priceMax = Math.ceil(price * 1.3);
    const where: Record<string, unknown> = {
      status: AdStatus.AKTIVAN,
      deletedAt: null,
      id: { not: source.id },
      kategorija: source.kategorija,
      cijena: { gte: priceMin, lte: priceMax },
      vlasnik: { shadowBanned: false },
    };
    if (source.potkategorija) where.potkategorija = source.potkategorija;
    const list = await prisma.ad.findMany({
      where,
      select: LISTING_SELECT,
      orderBy: { createdAt: 'desc' as const },
      take: 8,
    });
    const ads = list.map(serializeListingAd);
    const payload = { ads };
    try {
      JSON.stringify(payload);
    } catch (serErr) {
      console.error('Similar ads JSON serialize error:', slug, serErr);
    }
    return s.json(payload);
  } catch (err) {
    console.error('Similar ads error:', slug, err);
    s.status(500).json({ error: 'Greška pri preuzimanju sličnih oglasa' });
  }
}) as any);

/** Serijalizuje Ad za JSON – izbjegava Prisma Decimal i druge probleme. */
function serializeAdForJson(ad: any, poglediOverride?: number) {
  try {
    const pogledi = poglediOverride ?? ad?.pogledi;
    const v = ad?.vlasnik;
    return {
      id: ad?.id ?? '',
      naslov: ad?.naslov ?? '',
      slug: ad?.slug ?? '',
      opis: ad?.opis ?? '',
      kategorija: ad?.kategorija ?? '',
      potkategorija: ad?.potkategorija ?? null,
      cijena: safeNum(ad?.cijena),
      lokacija: ad?.lokacija ?? '',
      lat: ad?.lat ?? null,
      lng: ad?.lng ?? null,
      status: ad?.status ?? 'AKTIVAN',
      vlasnikId: ad?.vlasnikId ?? '',
      pogledi: typeof pogledi === 'number' && !Number.isNaN(pogledi) ? pogledi : safeNum(pogledi),
      expiresAt: safeDate(ad?.expiresAt),
      featuredUntil: safeDate(ad?.featuredUntil),
      tipOglasa: ad?.tipOglasa ?? null,
      details: ad?.details ?? null,
      make: ad?.make ?? null,
      model: ad?.model ?? null,
      makeId: ad?.makeId ?? null,
      modelId: ad?.modelId ?? null,
      vehicleSpecs: ad?.vehicleSpecs ?? null,
      lastActivityAt: safeDate(ad?.lastActivityAt),
      createdAt: safeDate(ad?.createdAt),
      updatedAt: safeDate(ad?.updatedAt),
      images: Array.isArray(ad?.images)
        ? ad.images.map((img: any) => ({
            url: img?.url ?? '',
            thumbUrl: img?.thumbUrl ?? null,
            width: img?.width ?? null,
            height: img?.height ?? null,
            order: safeNum(img?.order),
          }))
        : [],
      vlasnik: v ? { id: v.id ?? '', ime: v.ime ?? '', telefon: v.telefon ?? '' } : null,
    };
  } catch (e) {
    console.error('serializeAdForJson error:', e);
    throw e;
  }
}

/**
 * GET single ad by slug – view throttle DB-backed (30 min), multi-instance safe.
 * Admin (authenticated) may view pending (NA_CEKANJU) ads for moderation.
 */
router.get('/:slug', optionalAuthenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const slug = r.params.slug;
  if (!slug) return s.status(400).json({ error: 'Slug je obavezan' });
  const isAdmin = r.user?.role === 'ADMIN';
  const where = isAdmin
    ? { slug, deletedAt: null }
    : { slug, status: AdStatus.AKTIVAN, deletedAt: null };
  const userId = r.user?.userId ?? null;
  const ip = r.ip ?? r.connection?.remoteAddress ?? undefined;
  const key = viewThrottleKey(userId, ip);

  try {
    const ad = await prisma.ad.findFirst({
      where,
      include: {
        images: {
          orderBy: { order: 'asc' },
          select: { url: true, thumbUrl: true, width: true, height: true, order: true },
        },
        vlasnik: { select: { id: true, ime: true, telefon: true } },
      },
    });
    if (!ad) return s.status(404).json({ error: 'Oglas nije pronađen' });

    let doIncrement = false;
    try {
      doIncrement = await canIncrementAndRecord(ad.id, key);
      if (doIncrement) {
        await prisma.ad.update({ where: { id: ad.id }, data: { pogledi: { increment: 1 } } });
      }
    } catch (throttleErr) {
      console.warn('View throttle error (continuing without increment):', throttleErr);
    }
    const pogledi = ad.pogledi + (doIncrement ? 1 : 0);
    const payload = serializeAdForJson(ad, pogledi);
    try {
      JSON.stringify(payload);
    } catch (serErr) {
      console.error('Ad by slug JSON serialize error:', slug, serErr);
    }
    s.json(payload);
  } catch (err) {
    console.error('Ad by slug error:', slug, err);
    s.status(500).json({ error: 'Greška pri preuzimanju oglasa' });
  }
}) as any);

/**
 * Create Ad
 * Automatically sets expiresAt to now + 30 days. featuredUntil only via payment (webhook).
 */
router.post('/', createAdLimiter as any, authenticate as any, (async (req: Request, res: Response) => {
  let imagesForCleanup: { url: string; thumbUrl?: string | null }[] = [];
  try {
    // Fix: Cast req and res to any to access custom user property and express methods
    const r = req as any;
    const s = res as any;
    const userId = r.user?.userId;
    if (!userId) {
      s.status(401).json({ error: 'Niste autentifikovani' });
      return;
    }

    const validated = createAdSchema.parse(r.body);
    imagesForCleanup =
      validated.images?.map((img) => ({ url: img.url, thumbUrl: img.thumbUrl ?? null })) ?? [];
    const naslov = sanitizeHTML(validated.naslov);
    const opis = sanitizeHTML(validated.opis);
    if (naslov.length < 3) {
      s.status(400).json({ error: 'Naslov mora imati najmanje 3 znaka.' });
      return;
    }
    if (opis.length < 10) {
      s.status(400).json({ error: 'Opis mora imati najmanje 10 znakova.' });
      return;
    }

    const titleNorm = normalizeTitle(naslov);
    const dedupeKey = computeDedupeKey({
      userId,
      kategorija: validated.kategorija,
      potkategorija: validated.potkategorija ?? null,
      naslov,
      lokacija: validated.lokacija,
      cijena: Number(validated.cijena),
      make: validated.make ?? null,
      model: validated.model ?? null,
      makeId: null,
      modelId: null,
      vehicleSpecs: validated.vehicleSpecs ?? null,
    });

    const DEDUPE_WINDOW_HOURS = 24;
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - DEDUPE_WINDOW_HOURS);

    const cleanDetails = validated.details && typeof validated.details === 'object' && !Array.isArray(validated.details)
      ? (JSON.parse(JSON.stringify(validated.details)) as Record<string, unknown>)
      : undefined;
    const cleanVehicleSpecs = validated.vehicleSpecs && typeof validated.vehicleSpecs === 'object' && !Array.isArray(validated.vehicleSpecs)
      ? (JSON.parse(JSON.stringify(validated.vehicleSpecs)) as Record<string, unknown>)
      : undefined;

    const ad = await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}::text))`;

      const duplicate = await tx.ad.findFirst({
        where: {
          vlasnikId: userId,
          dedupeKey,
          deletedAt: null,
          status: { not: AdStatus.ISTEKAO },
          createdAt: { gte: windowStart },
        },
        select: { id: true, slug: true },
      });

      if (duplicate) {
        throw { _duplicate: true, id: duplicate.id, slug: duplicate.slug };
      }

      const slug = `${naslov.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      return tx.ad.create({
        data: {
          naslov,
          slug,
          opis,
          cijena: new Prisma.Decimal(Number(validated.cijena)),
          kategorija: validated.kategorija,
          potkategorija: validated.potkategorija ?? undefined,
          lokacija: validated.lokacija,
          lat: validated.lat ?? undefined,
          lng: validated.lng ?? undefined,
          status: AdStatus.NA_CEKANJU,
          vlasnikId: userId,
          expiresAt: expiresAt,
          tipOglasa: validated.tipOglasa ?? 'prodajem',
          details: cleanDetails,
          make: validated.make ?? undefined,
          model: validated.model ?? undefined,
          vehicleSpecs: cleanVehicleSpecs,
          dedupeKey,
          titleNorm,
          images: validated.images?.length
            ? {
                create: validated.images.map((img, index) => ({
                  url: String(img.url),
                  thumbUrl: img.thumbUrl ? String(img.thumbUrl) : null,
                  width: img.width ?? null,
                  height: img.height ?? null,
                  order: index,
                })),
              }
            : undefined
        },
        include: { images: true, vlasnik: { select: { id: true, ime: true, telefon: true } } }
      });
    });

    // Nakon kreiranja oglasa, premjesti slike iz tmp/ u ads/<userId>/<adId>/ i osvježi URL-ove.
    try {
      const supabase = getSupabase();
      if (supabase && ad.images?.length) {
        const moves: { from: string; to: string; id: string; kind: 'main' | 'thumb' }[] = [];

        for (const img of ad.images as { id: string; url: string; thumbUrl?: string | null }[]) {
          const mainPath = extractStoragePath(img.url, BUCKET_ADS);
          if (mainPath && mainPath.includes('/tmp/')) {
            const mainNewPath = mainPath.replace('/tmp/', `/${ad.id}/`);
            moves.push({ from: mainPath, to: mainNewPath, id: img.id, kind: 'main' });
          }
          if (img.thumbUrl) {
            const thumbPath = extractStoragePath(img.thumbUrl, BUCKET_ADS);
            if (thumbPath && thumbPath.includes('/tmp/')) {
              const thumbNewPath = thumbPath.replace('/tmp/', `/${ad.id}/`);
              moves.push({ from: thumbPath, to: thumbNewPath, id: img.id, kind: 'thumb' });
            }
          }
        }

        if (moves.length) {
          const bucket = BUCKET_ADS;
          // Izvrši move operacije
          for (const m of moves) {
            try {
              await supabase.storage.from(bucket).move(m.from, m.to);
            } catch (err) {
              console.error(
                JSON.stringify({
                  timestamp: new Date().toISOString(),
                  requestId: (req as any).requestId,
                  event: 'ad_image_move_error',
                  adId: ad.id,
                  from: m.from,
                  to: m.to,
                  error: err instanceof Error ? err.message : String(err),
                })
              );
            }
          }

          // Re-izračunaj public URL-ove i upiši ih u bazu
          const updatesById: Record<
            string,
            { url?: string; thumbUrl?: string | null }
          > = {};

          for (const m of moves) {
            const record = (updatesById[m.id] ||= {});
            const { data } = supabase.storage.from(bucket).getPublicUrl(m.to);
            if (m.kind === 'main') record.url = data.publicUrl;
            else record.thumbUrl = data.publicUrl;
          }

          for (const [id, data] of Object.entries(updatesById)) {
            await prisma.adImage.update({
              where: { id },
              data: {
                url: data.url,
                thumbUrl: data.thumbUrl ?? null,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId: (req as any).requestId,
          event: 'ad_image_move_post_create_error',
          adId: ad.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }

    // Obavijesti admine kada je oglas na čekanju (prikaz u zvoncu)
    if (ad.status === AdStatus.NA_CEKANJU) {
      try {
        const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
        const link = `/admin/pending`;
        const naslov = 'Novi oglas na čekanju';
        const poruka = ad.naslov?.slice(0, 80) || 'Oglas bez naslova';
        for (const admin of admins) {
          await createNotification(admin.id, 'ADMIN_PENDING_AD', naslov, poruka, link, ad.id, null);
        }
      } catch (notifErr) {
        console.error('Admin pending-ad notification:', notifErr);
      }
    }

    s.status(201).json(ad);
  } catch (err: unknown) {
    const s = res as { status: (n: number) => { json: (o: object) => void } };
    const dupe = err && typeof err === 'object' && '_duplicate' in err ? (err as { _duplicate: boolean; id?: string; slug?: string }) : null;
    if (dupe?._duplicate && dupe.id != null && dupe.slug != null) {
      s.status(409).json({
        code: 'DUPLICATE_AD',
        existingAdId: dupe.id,
        existingSlug: dupe.slug,
        message: 'Već imate isti ili vrlo sličan oglas objavljen u posljednjih 24h. Koristite Uredi ili Produži.',
      });
      return;
    }
    if (err instanceof z.ZodError) {
      s.status(400).json({ error: err.issues });
    } else {
      console.error('Ad create error:', err);
      await cleanupTmpUploads(getSupabase(), BUCKET_ADS, imagesForCleanup);
      s.status(500).json({ error: 'Greška pri kreiranju oglasa' });
    }
  }
}) as any);

export default router;
