import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { createNotification } from '../lib/notifications';
import { z } from 'zod';

const router = Router();

const checkoutLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Previše pokušaja. Pokušajte za 5 minuta.' },
  keyGenerator: (req: Request & { user?: { userId: string } }) =>
    req.user?.userId ?? (req.ip || 'anonymous')
});

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || FRONTEND_URL).replace(/\/$/, '');

const PLAN_PRICES: Record<number, number> = {
  7: 1000,   // 10 EUR cents
  14: 1600,   // 16 EUR cents
  30: 2800,   // 28 EUR cents
};

const checkoutSchema = z.object({
  adId: z.string().min(1, 'adId je obavezan'),
  planDays: z.union([z.literal(7), z.literal(14), z.literal(30)])
});

/**
 * POST /api/payments/checkout
 * Creates Stripe Checkout Session and Payment (pending). Returns session.url.
 */
router.post('/checkout', authenticate as any, checkoutLimiter as never, async (req: Request, res: Response) => {
  const r = req as { user?: { userId: string }; body?: unknown };
  const s = res as Response & { json: (body: unknown) => void; status: (code: number) => typeof s };
  const userId = r.user?.userId;
  if (!userId) {
    s.status(401).json({ error: 'Niste autentifikovani' });
    return;
  }
  if (!STRIPE_SECRET && process.env.TEST_MODE !== 'true') {
    s.status(503).json({ error: 'Plaćanja nisu konfigurisana' });
    return;
  }

  try {
    const parsed = checkoutSchema.safeParse(r.body);
    if (!parsed.success) {
      s.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Nevalidni podaci' });
      return;
    }
    const { adId, planDays } = parsed.data;
    const amountCents = PLAN_PRICES[planDays];
    if (!amountCents) {
      s.status(400).json({ error: 'Nevažeći plan' });
      return;
    }

    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true, vlasnikId: true, naslov: true }
    });
    if (!ad) {
      s.status(404).json({ error: 'Oglas nije pronađen' });
      return;
    }
    if (ad.vlasnikId !== userId) {
      s.status(403).json({ error: 'Možete promovirati samo svoje oglase' });
      return;
    }
    // TEST_MODE: stub Stripe checkout tokom E2E testova (nema stvarne integracije).
    if (process.env.TEST_MODE === 'true') {
      const fakeSessionId = `test_session_${Date.now()}`;
      await prisma.payment.create({
        data: {
          userId,
          adId,
          amount: amountCents,
          currency: 'eur',
          status: 'pending',
          stripeSessionId: fakeSessionId,
          planDays
        }
      });
      const fakeUrl = `${PUBLIC_SITE_URL}/payment-success?session_id=${encodeURIComponent(
        fakeSessionId
      )}&ad_id=${encodeURIComponent(adId)}`;
      s.json({ url: fakeUrl });
      return;
    }

    const stripe = new Stripe(STRIPE_SECRET!, { apiVersion: '2026-01-28.clover' });
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: {
            name: `Istaknuti oglas: ${planDays} dana`,
            description: `Promocija oglasa "${ad.naslov}" na ${planDays} dana.`,
            images: undefined
          }
        },
        quantity: 1
      }],
      success_url: `${PUBLIC_SITE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&ad_id=${adId}`,
      cancel_url: `${PUBLIC_SITE_URL}/moji-oglasi?cancel=1`,
      client_reference_id: userId,
      metadata: {
        adId,
        userId,
        planDays: String(planDays)
      }
    });

    if (!session.id || !session.url) {
      s.status(500).json({ error: 'Greška pri kreiranju sesije' });
      return;
    }

    await prisma.payment.create({
      data: {
        userId,
        adId,
        amount: amountCents,
        currency: 'eur',
        status: 'pending',
        stripeSessionId: session.id,
        planDays
      }
    });

    s.json({ url: session.url });
  } catch (err) {
    console.error('[payments/checkout]', err);
    s.status(500).json({ error: 'Greška pri kreiranju plaćanja' });
  }
});

/**
 * GET /api/payments/session-status?session_id=xxx
 * For success page: check if payment succeeded.
 */
router.get('/session-status', authenticate as any, async (req: Request, res: Response) => {
  const r = req as { user?: { userId: string }; query?: { session_id?: string } };
  const s = res as Response & { json: (body: unknown) => void; status: (code: number) => typeof s };
  const userId = r.user?.userId;
  const sessionId = r.query?.session_id;
  if (!userId || !sessionId) {
    s.status(400).json({ error: 'session_id je obavezan' });
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    include: { ad: { select: { id: true, slug: true, featuredUntil: true } } }
  });
  if (!payment || payment.userId !== userId) {
    s.status(404).json({ error: 'Sesija nije pronađena' });
    return;
  }
  s.json({
    status: payment.status,
    adId: payment.adId,
    adSlug: payment.ad?.slug,
    featuredUntil: payment.ad?.featuredUntil?.toISOString() ?? null
  });
});

/**
 * POST /api/payments/webhook
 * Stripe webhook: raw body required for signature verification. Idempotent.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const s = res as Response & { send: (b: string) => void; status: (code: number) => typeof s };
  if (!STRIPE_WEBHOOK_SECRET) {
    s.status(503).send('Webhook secret not configured');
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const sig = req.headers['stripe-signature'];
  if (!rawBody || !sig) {
    s.status(400).send('Missing body or signature');
    return;
  }

  let event: Stripe.Event;
  try {
    const stripe = new Stripe(STRIPE_SECRET!, { apiVersion: '2026-01-28.clover' });
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    console.error('[payments/webhook] signature error:', msg);
    s.status(400).send(msg);
    return;
  }

  if (event.type !== 'checkout.session.completed') {
    s.status(200).send('ok');
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;

  const existing = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    include: { ad: true }
  });
  if (!existing) {
    console.error('[payments/webhook] Payment not found for session:', sessionId);
    s.status(200).send('ok');
    return;
  }

  if (existing.status === 'succeeded') {
    s.status(200).send('ok');
    return;
  }

  const planDays = existing.planDays ?? 7;
  const featuredUntil = new Date();
  featuredUntil.setDate(featuredUntil.getDate() + planDays);

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: 'succeeded',
        stripePaymentIntentId: session.payment_intent as string | undefined
      }
    }),
    existing.adId
      ? prisma.ad.update({
          where: { id: existing.adId },
          data: {
            featuredUntil: featuredUntil < (existing.ad?.featuredUntil ?? new Date(0))
              ? (existing.ad?.featuredUntil ?? featuredUntil)
              : featuredUntil
          }
        })
      : Promise.resolve()
  ]);

  await createNotification(
    existing.userId,
    'payment',
    'Promocija aktivirana',
    `Vaš oglas je sada istaknut na ${planDays} dana.`,
    existing.adId ? `/oglas/${(existing.ad as { slug?: string }).slug}` : undefined
  );

  s.status(200).send('ok');
});

export default router;
