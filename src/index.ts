import './env';

// TEST_MODE nikad ne smije biti aktivan u produkciji.
if (process.env.NODE_ENV === 'production' && process.env.TEST_MODE === 'true') {
  console.error('[SECURITY] TEST_MODE=true nije dozvoljen u produkciji. Uklonite TEST_MODE iz env.');
  process.exit(1);
}

import http from 'http';
import * as Sentry from '@sentry/node';
import express, { Request, Response, RequestHandler, ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

import { validateEnv } from './config/env';
import { initSocket } from './lib/socket';
import prisma, { prismaQueryStore } from './lib/prisma';
import authRoutes from './routes/auth';
import adsRoutes from './routes/ads';
import notificationRoutes from './routes/notifications';
import favoritesRoutes from './routes/favorites';
import adminRoutes from './routes/admin';
import paymentsRoutes from './routes/payments';
import chatRoutes from './routes/chat';
import seoRoutes from './routes/seo';
import clientLogRoutes from './routes/clientLog';
import imgProxyRoutes from './routes/imgProxy';
import vehicleRoutes from './routes/vehicles';
import savedSearchesRoutes from './routes/savedSearches';
import { getSupabase } from './lib/supabase';
import { getHealthRedisClient } from './lib/redisHealth';

const env = validateEnv();
const NODE_ENV = env.NODE_ENV;
const PORT = env.PORT ?? 3000;
const FRONTEND_URL = env.FRONTEND_URL ?? '';
const APP_VERSION =
  process.env.GIT_SHA ||
  process.env.APP_VERSION ||
  process.env.npm_package_version ||
  'dev';

const SENTRY_DSN = process.env.SENTRY_DSN;
let SENTRY_ENABLED = false;
if (SENTRY_DSN && typeof SENTRY_DSN === 'string' && SENTRY_DSN.trim()) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN.trim(),
      environment: NODE_ENV,
      release: APP_VERSION,
      tracesSampleRate: 0.1,
    });
    SENTRY_ENABLED = true;
  } catch (err) {
    // Sentry inicijalizacija nikad ne smije srušiti aplikaciju.
    console.error(
      '[Sentry] Inicijalizacija nije uspjela:',
      err instanceof Error ? err.message : err
    );
  }
}

const app = express();

const corsOptions = {
  origin: NODE_ENV === 'production' && FRONTEND_URL
    ? [FRONTEND_URL.replace(/\/$/, '')]
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://js.stripe.com", "https://*.stripe.com", "https://accounts.google.com", "https://apis.google.com"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://accounts.google.com"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://*.stripe.com", "https://accounts.google.com", "https://*.google.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.stripe.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    },
    hsts: NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
  }) as any
);
app.use(cors(corsOptions) as any);
app.use(compression() as any);

// Stripe webhook needs raw body for signature verification
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req: Request, _res, next) => {
    (req as Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
    next();
  }
);
app.use(express.json({ limit: '2mb' }) as any);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: NODE_ENV !== 'production' ? 2000 : 200,
  message: { error: 'Previše zahtjeva, pokušajte ponovo za 15 minuta.' } as any,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', apiLimiter as any);

const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const headerId = req.headers['x-request-id'];
  const requestId = (Array.isArray(headerId) ? headerId[0] : (headerId as string | undefined)) || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  const isAdsListing = req.method === 'GET' && (req.path === '/api/ads' || req.path === '/api/ads/');
  const store = NODE_ENV === 'development' && isAdsListing ? { count: 0 } : null;

  const runNext = () => {
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logPayload: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip
      };
      if (store) (logPayload as Record<string, unknown>).dbQueries = store.count;
      console.log(JSON.stringify(logPayload));
    });
    next();
  };

  if (store) prismaQueryStore.run(store, runNext);
  else runNext();
};

app.use(requestIdMiddleware as RequestHandler);

app.get('/health', async (_req: Request, res: Response) => {
  const timestamp = new Date();
  const uptimeSec = Math.round(process.uptime());

  // DB health
  let dbOk = false;
  let dbLatencyMs = -1;
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  // Redis health
  const redisUrl = process.env.REDIS_URL?.trim();
  let redisOk = false;
  let redisMode: 'single' | 'cluster' | 'none' = 'none';
  let redisLatencyMs: number | undefined;
  let redisStatus: 'ok' | 'error' | 'not_configured' = 'not_configured';
  if (redisUrl) {
    redisMode = 'single';
    try {
      const client = getHealthRedisClient(redisUrl);
      const start = Date.now();
      await client.ping();
      redisLatencyMs = Date.now() - start;
      redisOk = true;
      redisStatus = 'ok';
    } catch {
      redisOk = false;
      redisStatus = 'error';
    }
  } else {
    redisMode = 'none';
    redisOk = false;
    redisStatus = 'not_configured';
  }

  // Storage health (Supabase)
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  let storageProvider: 'supabase' | 'local' | 'unknown' = 'unknown';
  let storageStatus: 'ok' | 'error' | 'not_configured' = 'not_configured';
  let storageOk = false;
  if (supabaseUrl) {
    storageProvider = 'supabase';
    // getSupabase vraća klijenta ako je konfigurisan – dovoljna lightweight provjera.
    storageOk = !!getSupabase();
    storageStatus = storageOk ? 'ok' : 'error';
  } else {
    storageProvider = 'unknown';
    storageOk = true;
    storageStatus = 'not_configured';
  }

  // Redis nije kritična zavisnost: ako nije konfigurisan, ne utiče na root ok.
  const ok = dbOk && storageOk && (redisUrl ? redisOk : true);
  res.status(ok ? 200 : 503);

  (res as Response & { json: (b: unknown) => void }).json({
    ok,
    version: APP_VERSION,
    env: NODE_ENV,
    uptimeSec,
    timestamp: timestamp.toISOString(),
    db: { ok: dbOk, latencyMs: dbLatencyMs },
    redis: { ok: redisOk, mode: redisMode, status: redisStatus, latencyMs: redisLatencyMs },
    storage: { ok: storageOk, provider: storageProvider, status: storageStatus },
  });
});

app.use('/', seoRoutes);
app.use('/api', clientLogRoutes);
app.use('/api', imgProxyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/saved-searches', savedSearchesRoutes);
app.use('/api/admin', adminRoutes);

const centralErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.requestId;
  const errorMessage = err instanceof Error ? err.message : String(err);
  const safePayload: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    path: req.path,
    route: `${req.method} ${req.path}`,
    statusCode: 500,
    error: NODE_ENV === 'production' ? 'Interna serverska greška' : errorMessage,
    errorName: err instanceof Error ? err.name : undefined,
  };
  if (NODE_ENV !== 'production' && err instanceof Error && err.stack) {
    safePayload.stack = err.stack;
  }

  if (SENTRY_ENABLED) {
    try {
      Sentry.withScope((scope) => {
        scope.setTag('requestId', requestId || 'unknown');
        scope.setTag('route', `${req.method} ${req.path}`);
        scope.setTag('method', req.method);
        scope.setTag('statusCode', '500');
        const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
        if (userId) {
          scope.setUser({ id: userId });
        }
        scope.setExtras({
          requestId,
          method: req.method,
          path: req.path,
        });
        Sentry.captureException(err);
      });
    } catch (sentryErr) {
      console.error(
        '[Sentry] captureException failed:',
        sentryErr instanceof Error ? sentryErr.message : sentryErr
      );
    }
  }

  console.error(JSON.stringify(safePayload));

  res.status(500).json({
    error: NODE_ENV === 'production' ? 'Interna serverska greška' : errorMessage,
    requestId,
  });
};

app.use(centralErrorHandler as ErrorRequestHandler);

const bootstrap = async () => {
  try {
    await prisma.$connect();
    const httpServer = http.createServer(app);
    const corsOrigin = NODE_ENV === 'production' && FRONTEND_URL
      ? [FRONTEND_URL.replace(/\/$/, '')]
      : true;
    await initSocket(httpServer, corsOrigin);
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Povezi.me Backend aktivan na portu ${PORT}`);
      if (getSupabase()) console.log('✓ Supabase upload: konfigurisan.');
      else console.warn('⚠ Supabase: nije konfigurisan. Postavite SUPABASE_URL i SUPABASE_SERVICE_KEY.');
      if (NODE_ENV === 'production') {
        if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST)
          console.warn('⚠ Email: nije konfigurisan. Zaboravljena lozinka neće slati. Postavite RESEND_API_KEY ili SMTP.');
        if (!process.env.STRIPE_SECRET_KEY) console.warn('⚠ Stripe: nije konfigurisan. Plaćanja neće raditi.');
      }
      console.log('✓ Socket.io: real-time chat omogućen.');
    });
  } catch (err) {
    console.error('application_bootstrap_failed', err);
    process.exit(1);
  }
};

// Only bootstrap if we are not running tests
if (process.env.NODE_ENV !== 'test') {
  bootstrap();
}

export { app };