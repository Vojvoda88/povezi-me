/**
 * Pun URL backend API-ja – za redirect (npr. Google prijava) da browser ide direktno na backend.
 * U dev-u: http://localhost:3001/api (da ne ovisi o Vite proxyu).
 * U prod: isti kao getApiBase(). Bez trailing slash.
 */
export function getApiBaseForRedirect(): string {
  const env = (import.meta as any)?.env as { VITE_API_URL?: string; DEV?: boolean } | undefined;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const fromEnv = env?.VITE_API_URL;
    if (isLocalHost && (!fromEnv || fromEnv.startsWith('/'))) return `http://localhost:3001/api`;
    if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv.trim().replace(/\/+$/, '');
    // Fallback: Vercel frontend → Render backend (za Google prijavu itd.)
    if (host.includes('povezi-me.vercel.app') || (host.endsWith('.vercel.app') && host.includes('povezi'))) {
      return 'https://povezi-me.onrender.com/api';
    }
  }
  return getApiBase();
}

/**
 * API base URL za frontend (samo Vite; ne koristi backend build).
 * - Dev: uvijek "/api" (Vite proxy)
 * - Prod: VITE_API_URL (obavezno pri build-u). Bez trailing slash.
 * Ako VITE_API_URL nije postavljen u production build-u, loguje se upozorenje.
 */
export function getApiBase(): string {
  const env = (import.meta as any)?.env as { VITE_API_URL?: string; DEV?: boolean; MODE?: string } | undefined;
  const fromEnv = env?.VITE_API_URL;
  // U dev-u i lokalnom okruženju: strogo /api (Vite proxy)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const isDev = env?.DEV === true || isLocalHost;
    if (isDev) {
      return '/api';
    }
  }

  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    const url = fromEnv.trim().replace(/\/+$/, '');
    const isLocalhost = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/.test(url);
    if (!isLocalhost) return url;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalHost) {
      // Fallback za poznati production frontend na Vercelu – API je na Renderu
      if (host.includes('povezi-me.vercel.app') || (host.endsWith('.vercel.app') && host.includes('povezi'))) {
        return 'https://povezi-me.onrender.com/api';
      }
      if (env?.MODE === 'production' && (!fromEnv || !fromEnv.trim())) {
        console.warn('[Povezi.ME] VITE_API_URL nije definisan u production build-u. Postavite VITE_API_URL pri build-u.');
      }
      if (window.location.protocol === 'https:' || window.location.protocol === 'http:') {
        const apiHost = host.replace(/^www\./, '');
        return `${window.location.protocol}//api.${apiHost}/api`;
      }
    }
    // Lokalno bez definisanog VITE_API_URL: uvijek koristi Vite proxy
    return '/api';
  }
  // SSR / fallback: preferiraj VITE_API_URL, u suprotnom koristi relativni /api da prođe kroz proxy/CDN
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.trim().replace(/\/+$/, '');
  }
  return '/api';
}

/** Base URL za Socket.io (isti host kao API, bez /api putanje). Koristi VITE_SOCKET_URL ako je postavljen. */
export function getSocketUrl(): string {
  const env = import.meta as unknown as { env?: { VITE_SOCKET_URL?: string; DEV?: boolean } };
  const fromEnv = env.env?.VITE_SOCKET_URL;
  if (fromEnv && typeof fromEnv === 'string' && fromEnv.trim() !== '')
    return fromEnv.trim().replace(/\/$/, '');
  // U dev-u sa proxy, socket ide na isti origin pa se prosljeđuje
  if (env.env?.DEV === true && typeof window !== 'undefined')
    return window.location.origin;
  const base = getApiBase();
  return base.replace(/\/api\/?$/, '') || base;
}

/** Da li je chat debug uključen (VITE_DEBUG_CHAT=true). */
export function isChatDebug(): boolean {
  const env = import.meta as unknown as { env?: { VITE_DEBUG_CHAT?: string } };
  return env.env?.VITE_DEBUG_CHAT === 'true';
}

/**
 * Ako je URL sa Supabase storage-a, vraća proxy URL (/api/img?url=...) da CDN može keširati.
 * width/height (pikseli): dodaje &w= i &h= za resize na proxyju – brže učitavanje u listi.
 * Inače vraća isti URL. Za prazan/undefined vraća ''.
 */
/** 1x1 transparent GIF – koristi se kad slika potpuno ne učitava (ne ruši layout, nema broken ikone). */
export const TRANSPARENT_1X1 =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function getProxiedImageUrl(
  url: string | undefined | null,
  width?: number,
  height?: number
): string {
  if (url == null || url === '') return '';
  const safe = String(url).trim();
  const httpsUrl = safe.startsWith('http://') ? 'https://' + safe.slice(7) : safe;
  if (!httpsUrl.includes('supabase.co/storage')) return httpsUrl;
  const base = getApiBase();
  let out = `${base}/img?url=${encodeURIComponent(httpsUrl)}`;
  if (width != null && width > 0) out += `&w=${Math.min(width, 1200)}`;
  if (height != null && height > 0) out += `&h=${Math.min(height, 1200)}`;
  return out;
}
