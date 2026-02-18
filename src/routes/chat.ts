import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { emitNewMessage } from '../lib/socket';

const router = Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Previše poruka. Pokušajte za minut.' },
  keyGenerator: (req: Request & { user?: { userId: string } }) =>
    req.user?.userId ?? (req.ip || 'anonymous')
});
const MESSAGES_PAGE_SIZE = 50;

const createConversationSchema = z.object({
  adId: z.string().min(1)
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000)
});

/**
 * GET /api/chat/conversations
 * List conversations for current user (as initiator or participant).
 */
router.get('/conversations', authenticate as any, async (req: Request, res: Response) => {
  const r = req as { user?: { userId: string } };
  const s = res as Response & { json: (b: unknown) => void; status: (n: number) => typeof s };
  const userId = r.user?.userId;
  if (!userId) {
    s.status(401).json({ error: 'Niste autentifikovani' });
    return;
  }
  try {
    const convos = await prisma.conversation.findMany({
      where: {
        OR: [
          { initiatorId: userId },
          { participants: { some: { userId } } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        ad: { select: { id: true, naslov: true, slug: true, vlasnikId: true } },
        initiator: { select: { id: true, ime: true } },
        participants: { include: { user: { select: { id: true, ime: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true, senderId: true, isRead: true }
        }
      }
    });
    const list = convos.map((c: { id: string; adId: string | null; ad: unknown; initiator: unknown; participants: Array<{ user: { id: string; ime: string } }>; messages: Array<{ id: string; content: string; createdAt: Date; senderId: string; isRead: boolean }>; createdAt: Date }) => ({
      id: c.id,
      adId: c.adId,
      ad: c.ad,
      initiator: c.initiator,
      participants: c.participants.map((p: { user: { id: string; ime: string } }) => p.user),
      lastMessage: c.messages[0] ?? null,
      createdAt: c.createdAt.toISOString(),
      unreadCount: 0
    }));
    const unreadCounts = await Promise.all(
      list.map(async (conv: { id: string }) => {
        const count = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            isRead: false
          }
        });
        return { id: conv.id, count };
      })
    );
    const withUnread = list.map((conv: { id: string; adId: string | null; ad: unknown; initiator: unknown; participants: Array<{ id: string; ime: string }>; lastMessage: unknown; createdAt: string; unreadCount: number }) => ({
      ...conv,
      unreadCount: unreadCounts.find((u) => u.id === conv.id)?.count ?? 0
    }));
    s.json({ conversations: withUnread });
  } catch (err) {
    console.error('[chat/conversations]', err);
    s.status(500).json({ error: 'Greška pri učitavanju razgovora' });
  }
});

/**
 * POST /api/chat – start or get existing conversation for an ad
 * Body: { adId }. Returns { conversationId, conversation }.
 */
router.post('/', authenticate as any, async (req: Request, res: Response) => {
  const r = req as { user?: { userId: string }; body?: unknown };
  const s = res as Response & { json: (b: unknown) => void; status: (n: number) => typeof s };
  const userId = r.user?.userId;
  if (!userId) {
    s.status(401).json({ error: 'Niste autentifikovani' });
    return;
  }
  const parsed = createConversationSchema.safeParse(r.body);
  if (!parsed.success) {
    s.status(400).json({ error: 'adId je obavezan' });
    return;
  }
  const { adId } = parsed.data;
  const ad = await prisma.ad.findUnique({
    where: { id: adId },
    select: { id: true, vlasnikId: true, naslov: true, slug: true }
  });
  if (!ad) {
    s.status(404).json({ error: 'Oglas nije pronađen' });
    return;
  }
  if (ad.vlasnikId === userId) {
    s.status(400).json({ error: 'Ne možete otvoriti razgovor sa samim sobom' });
    return;
  }
  const existing = await prisma.conversation.findFirst({
    where: { adId, initiatorId: userId },
    include: {
      ad: { select: { id: true, naslov: true, slug: true } },
      participants: { include: { user: { select: { id: true, ime: true } } } }
    }
  });
  if (existing) {
    s.status(200).json({ conversationId: existing.id, conversation: existing });
    return;
  }
  const conversation = await prisma.conversation.create({
    data: {
      adId,
      initiatorId: userId,
      participants: {
        create: [
          { userId },
          { userId: ad.vlasnikId }
        ]
      }
    },
    include: {
      ad: { select: { id: true, naslov: true, slug: true } },
      participants: { include: { user: { select: { id: true, ime: true } } } }
    }
  });
  s.status(201).json({ conversationId: conversation.id, conversation });
});

/**
 * GET /api/chat/:conversationId – messages with pagination
 */
router.get('/:conversationId', authenticate as any, async (req: Request, res: Response) => {
  const r = req as unknown as { user?: { userId: string }; params?: { conversationId: string }; query?: { page?: string } };
  const s = res as Response & { json: (b: unknown) => void; status: (n: number) => typeof s };
  const userId = r.user?.userId;
  const conversationId = r.params?.conversationId;
  if (!userId || !conversationId) {
    s.status(400).json({ error: 'conversationId je obavezan' });
    return;
  }
  const page = Math.max(1, parseInt(r.query?.page ?? '1', 10));
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ initiatorId: userId }, { participants: { some: { userId } } }]
    },
    include: {
      ad: {
        select: {
          id: true,
          naslov: true,
          slug: true,
          cijena: true,
          images: { select: { url: true }, orderBy: { order: 'asc' } }
        }
      },
      participants: { include: { user: { select: { id: true, ime: true } } } }
    }
  });
  if (!conv) {
    s.status(404).json({ error: 'Razgovor nije pronađen' });
    return;
  }
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * MESSAGES_PAGE_SIZE,
      take: MESSAGES_PAGE_SIZE,
      include: { sender: { select: { id: true, ime: true } } }
    }),
    prisma.message.count({ where: { conversationId } })
  ]);
  await prisma.message.updateMany({
    where: { conversationId, senderId: { not: userId }, isRead: false },
    data: { isRead: true }
  });
  s.json({
    conversation: conv,
    messages: messages.reverse(),
    total,
    page,
    limit: MESSAGES_PAGE_SIZE
  });
});

/**
 * POST /api/chat/:conversationId/message
 */
router.post('/:conversationId/message', authenticate as any, messageLimiter as never, async (req: Request, res: Response) => {
  const r = req as unknown as { user?: { userId: string }; params?: { conversationId: string }; body?: unknown };
  const s = res as Response & { json: (b: unknown) => void; status: (n: number) => typeof s };
  const userId = r.user?.userId;
  const conversationId = r.params?.conversationId;
  if (!userId || !conversationId) {
    s.status(400).json({ error: 'conversationId je obavezan' });
    return;
  }
  const parsed = sendMessageSchema.safeParse(r.body);
  if (!parsed.success) {
    s.status(400).json({ error: 'Poruka je obavezna (max 5000 znakova)' });
    return;
  }
  const conv = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ initiatorId: userId }, { participants: { some: { userId } } }]
    },
    include: { participants: true, ad: true }
  });
  if (!conv) {
    s.status(404).json({ error: 'Razgovor nije pronađen' });
    return;
  }
  const otherParticipant = conv.participants.find((p: { userId: string }) => p.userId !== userId);
  const message = await prisma.message.create({
    data: { conversationId, senderId: userId, content: parsed.data.content.trim() },
    include: { sender: { select: { id: true, ime: true } } }
  });
  if (otherParticipant) {
    emitNewMessage(otherParticipant.userId, {
      conversationId,
      message: { ...message, createdAt: message.createdAt.toISOString() }
    });
  }
  s.status(201).json(message);
});

export default router;
