import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Previše spremljenih pretraga. Pokušajte za sat vremena.' },
});

router.get('/', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  try {
    const list = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, naziv: true, query: true, createdAt: true },
    });
    s.json(list);
  } catch (err) {
    s.status(500).json({ error: 'Greška pri preuzimanju spremljenih pretraga' });
  }
}) as any);

router.post('/', createLimiter as any, authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const naziv = typeof r.body?.naziv === 'string' ? r.body.naziv.trim() || null : null;
  const query = r.body?.query;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  if (!query || typeof query !== 'object') return s.status(400).json({ error: 'query (objekt) je obavezan' });
  try {
    const row = await prisma.savedSearch.create({
      data: { userId, naziv, query: query as object },
      select: { id: true, naziv: true, query: true, createdAt: true },
    });
    s.status(201).json(row);
  } catch (err) {
    s.status(500).json({ error: 'Greška pri spremanju pretrage' });
  }
}) as any);

router.delete('/:id', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const id = r.params.id;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  try {
    await prisma.savedSearch.deleteMany({
      where: { id, userId },
    });
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri brisanju pretrage' });
  }
}) as any);

export default router;
