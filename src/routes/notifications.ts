import { Router, Request, Response } from 'express';
import type { Notification } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { runAdLifecycleCheck } from '../lib/adLifecycle';

const router = Router();

const CHAT_TIPS = ['message', 'chat', 'new_message', 'conversation'];

router.get('/', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  try {
    runAdLifecycleCheck().catch(() => {});
    const list = await prisma.notification.findMany({
      where: { userId, tip: { notIn: CHAT_TIPS } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    s.json(list.map((n: Notification) => ({
      id: n.id,
      korisnikId: n.userId,
      tip: n.tip,
      naslov: n.naslov,
      poruka: n.poruka,
      link: n.link,
      entityId: n.entityId,
      procitano: n.procitano,
      createdAt: new Date(n.createdAt).getTime()
    })));
  } catch (err) {
    console.error('Notifications GET error:', err);
    s.status(500).json({ error: 'Greška pri preuzimanju obavještenja' });
  }
}) as any);

router.post('/mark-read', authenticate as any, (async (req: Request, res: Response) => {
  const r = req as any;
  const s = res as any;
  const userId = r.user?.userId;
  const { id } = r.body || {};
  if (!userId) return s.status(401).json({ error: 'Niste autentifikovani' });
  try {
    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { procitano: true }
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId },
        data: { procitano: true }
      });
    }
    s.json({ ok: true });
  } catch (err) {
    s.status(500).json({ error: 'Greška pri ažuriranju' });
  }
}) as any);

export default router;
