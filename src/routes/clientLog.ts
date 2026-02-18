import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

const clientLogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Previše zahtjeva.' } as any,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/log-client-error
 * Prima client-side greške (window.onerror, unhandledrejection, ErrorBoundary).
 * Samo loguje; ne utiče na aplikaciju. Optional – frontend radi i ako endpoint ne postoji.
 */
router.post('/log-client-error', clientLogLimiter as any, (req: Request, res: Response) => {
  const r = req as Request & { body?: { message?: string; stack?: string; type?: string; url?: string; timestamp?: string } };
  const body = r.body || {};
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      clientTimestamp: body.timestamp,
      type: body.type || 'error',
      message: typeof body.message === 'string' ? body.message.slice(0, 2000) : '',
      url: typeof body.url === 'string' ? body.url.slice(0, 500) : undefined,
      stack: typeof body.stack === 'string' ? body.stack.slice(0, 8000) : undefined,
      requestId: (req as Request & { requestId?: string }).requestId,
      ip: req.ip,
    };
    console.log(JSON.stringify({ event: 'client_error', ...payload }));
  } catch {
    // ignore
  }
  res.status(204).end();
});

export default router;
