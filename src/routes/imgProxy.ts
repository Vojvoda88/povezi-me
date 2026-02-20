import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import sharp from 'sharp';

const router = Router();

const CACHE_MAX_AGE = 86400; // 24h
const MAX_RESIZE = 1200; // max širina/visina za resize (zaštita od preopterećenja)

/** Dozvoljeni storage domen – samo naš Supabase projekat. */
function getAllowedStorageOrigin(): string {
  const url = (process.env.SUPABASE_URL || '').trim();
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

const imgProxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Previše zahtjeva.' } as any,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/img?url=<encoded-supabase-storage-url>&w=400&h=400
 * Proxy za slike sa Supabase storage-a. Vraća sliku sa Cache-Control 24h.
 * Opciono: w i/ili h (pikseli) – slika se smanji (max 1200px), servira se kao WebP.
 * Bez w/h: prosljeđuje se original (isti Content-Type).
 */
router.get('/img', imgProxyLimiter as any, async (req: Request, res: Response): Promise<void> => {
  const raw = (req.query.url as string) || '';
  const decoded = decodeURIComponent(raw);
  const allowedOrigin = getAllowedStorageOrigin();
  const wRaw = req.query.w != null ? parseInt(String(req.query.w), 10) : NaN;
  const hRaw = req.query.h != null ? parseInt(String(req.query.h), 10) : NaN;
  const wantW = !Number.isNaN(wRaw) && wRaw > 0 ? Math.min(wRaw, MAX_RESIZE) : undefined;
  const wantH = !Number.isNaN(hRaw) && hRaw > 0 ? Math.min(hRaw, MAX_RESIZE) : undefined;
  const shouldResize = wantW != null || wantH != null;

  if (!allowedOrigin) {
    res.status(503).json({ error: 'Image proxy nije konfigurisan.' });
    return;
  }

  const imageUrl = (decoded || '').trim().startsWith('http://')
    ? 'https://' + (decoded || '').trim().slice(7)
    : (decoded || '').trim();
  if (!imageUrl || !imageUrl.startsWith(allowedOrigin) || !imageUrl.includes('/storage/')) {
    res.status(400).json({ error: 'Neispravan URL.' });
    return;
  }

  try {
    const resp = await fetch(imageUrl, {
      method: 'GET',
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      res.status(resp.status === 404 ? 404 : 502).send(resp.statusText);
      return;
    }

    const contentType = resp.headers.get('Content-Type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'Nije slika.' });
      return;
    }

    const buf = Buffer.from(await resp.arrayBuffer());

    if (shouldResize && buf.length > 0) {
      try {
        const pipeline = sharp(buf)
          .rotate()
          .resize({
            width: wantW,
            height: wantH,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 82 });
        const out = await pipeline.toBuffer();
        res.set({
          'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
          'Content-Type': 'image/webp',
          'Cross-Origin-Resource-Policy': 'cross-origin',
        });
        res.send(out);
        return;
      } catch (resizeErr) {
        console.warn('[imgProxy] resize failed, serving original', resizeErr);
      }
    }

    res.set({
      'Cache-Control': `public, max-age=${CACHE_MAX_AGE}`,
      'Content-Type': contentType,
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: 'Greška pri učitavanju slike.' });
  }
});

export default router;
