import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', (async (req: Request, res: Response) => {
  try {
    const sellerId = typeof req.query.sellerId === 'string' ? req.query.sellerId.trim() : null;
    const list = await prisma.rating.findMany({
      where: sellerId ? { sellerId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: { id: true, sellerId: true, raterId: true, score: true, comment: true, adId: true, createdAt: true },
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Greška pri preuzimanju recenzija' });
  }
}) as any);

router.post('/', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const userId = r.user?.userId;
  if (!userId) return (res as any).status(401).json({ error: 'Niste prijavljeni' });
  const sellerId = typeof r.body?.sellerId === 'string' ? r.body.sellerId.trim() : null;
  const scoreRaw = r.body?.score;
  const score = typeof scoreRaw === 'number' ? Math.round(scoreRaw) : parseInt(String(scoreRaw), 10);
  const comment = typeof r.body?.comment === 'string' ? r.body.comment.trim().slice(0, 500) || null : null;
  const adId = typeof r.body?.adId === 'string' ? r.body.adId.trim() || null : null;

  if (!sellerId) return (res as any).status(400).json({ error: 'sellerId je obavezan' });
  if (sellerId === userId) return (res as any).status(400).json({ error: 'Ne možete ocjenjivati sami sebe' });
  if (!Number.isFinite(score) || score < 1 || score > 5) return (res as any).status(400).json({ error: 'Ocjena mora biti 1-5' });

  try {
    const row = await prisma.rating.upsert({
      where: { raterId_sellerId: { raterId: userId, sellerId } },
      create: { sellerId, raterId: userId, score, comment, adId },
      update: { score, comment: comment ?? undefined, adId: adId ?? undefined },
      select: { id: true, sellerId: true, raterId: true, score: true, comment: true, adId: true, createdAt: true },
    });
    (res as any).status(201).json(row);
  } catch (err) {
    (res as any).status(500).json({ error: 'Greška pri spremanju ocjene' });
  }
}) as any);

export default router;
