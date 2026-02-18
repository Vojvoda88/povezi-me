import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { createNotification } from '../lib/notifications';

const router = Router();

const favoritesLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { error: 'Previše akcija. Pokušajte za sat vremena.' }
});

router.get('/', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  try {
    const rows = await prisma.userFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { adId: true }
    });
    s.json(rows.map((x: { adId: string }) => x.adId));
  } catch (err) {
    s.status(500).json({ error: 'Greška pri preuzimanju favorita' });
  }
}) as any);

router.post('/', favoritesLimiter as any, authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const adId = r.body?.adId;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  if (!adId || typeof adId !== 'string') return s.status(400).json({ error: 'adId je obavezan' });
  try {
    const existing = await prisma.userFavorite.findUnique({
      where: { userId_adId: { userId, adId } },
    });
    await prisma.userFavorite.upsert({
      where: { userId_adId: { userId, adId } },
      create: { userId, adId },
      update: {}
    });
    if (!existing) {
      const ad = await prisma.ad.findUnique({
        where: { id: adId },
        select: { vlasnikId: true, naslov: true, slug: true },
      });
      if (ad && ad.vlasnikId !== userId) {
        await createNotification(
          ad.vlasnikId,
          'LIKE_AD',
          'Novi lajk',
          `Neko je lajkovao vaš oglas "${ad.naslov}".`,
          `/oglas/${ad.slug}`,
          adId
        );
      }
    }
    s.status(201).json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri dodavanju u favorite' });
  }
}) as any);

router.delete('/:adId', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const adId = r.params.adId;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  try {
    await prisma.userFavorite.deleteMany({
      where: { userId, adId }
    });
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri uklanjanju iz favorita' });
  }
}) as any);

export default router;
