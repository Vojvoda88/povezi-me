/**
 * Scroll helper za CIJELU app. Radi sa data-scroll-root containerom ili document/window.
 * Koristi se za: detail uvijek top, lista save/restore pozicije.
 */

export type ScrollContainer = Window | HTMLElement | null;

/**
 * Vraća element koji stvarno skroluje:
 * 1) prvo traži element sa data-scroll-root
 * 2) fallback na document.scrollingElement ili window
 */
export function getScrollRoot(): ScrollContainer {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector('[data-scroll-root]');
  if (el && el instanceof HTMLElement) return el;
  const resetEl = document.querySelector('[data-scroll-reset]');
  if (resetEl && resetEl instanceof HTMLElement) return resetEl;
  if (document.scrollingElement) return document.scrollingElement as HTMLElement;
  return typeof window !== 'undefined' ? window : null;
}

/**
 * Skroluje scrollRoot na vrh (y=0).
 */
export function scrollToTop(): void {
  const el = getScrollRoot();
  if (!el) return;
  try {
    if (el === window) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    else (el as HTMLElement).scrollTop = 0;
  } catch (_) {}
}

/**
 * Hard reset - resetta SVE moguće scroll targete (pobijeda sve što pregaža).
 * Koristi se SAMO na ulasku u detail rutu.
 * Guard: ne resetira ako smo na list ruti (da ne pregazi restore pri povratku).
 */
export function hardScrollToTop(): void {
  if (typeof window === 'undefined') return;
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  if (pathname && !isDetailRoute(pathname)) return; // nikad reset na list rutama
  try {
    const root = getScrollRoot();
    if (root instanceof HTMLElement) root.scrollTop = 0;
    document.querySelectorAll('[data-scroll-root], [data-scroll-reset]').forEach((el) => {
      if (el instanceof HTMLElement) el.scrollTop = 0;
    });
    if (document.scrollingElement) (document.scrollingElement as HTMLElement).scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch (_) {}
}

/**
 * Vraća trenutni scrollTop.
 */
export function getScrollTop(): number {
  const el = getScrollRoot();
  if (!el) return 0;
  if (el === window) return window.scrollY ?? (window as Window & { pageYOffset?: number }).pageYOffset ?? 0;
  return (el as HTMLElement).scrollTop;
}

/**
 * Postavlja scrollTop = y (alias: setScrollTop).
 */
export function restoreScroll(y: number): void {
  const el = getScrollRoot();
  if (!el) return;
  try {
    const clamped = Math.max(0, Math.round(y));
    if (el === window) window.scrollTo({ top: clamped, left: 0, behavior: 'auto' });
    else (el as HTMLElement).scrollTop = clamped;
  } catch (_) {}
}

/** Alias za restoreScroll. */
export const setScrollTop = restoreScroll;

const SCROLL_LIST_PREFIX = 'scroll:list:';
export const RETURN_TO_MARKETPLACE_KEY = 'returnTo:marketplace';
export const SCROLL_TO_AD_SLUG_KEY = 'scrollToAd:slug';

/**
 * Generiše listRouteKey: pathname + search (npr. /marketplace?q=auto ili /admin/pending).
 */
export function getListRouteKey(pathname: string, search: string = ''): string {
  return pathname + (search || '');
}

/** Da li je pathname detail ruta (nikad restore na njoj). */
export function isDetailRoute(pathname: string): boolean {
  return /^\/oglas\/[^/]+$/.test(pathname) || /\/admin\/oglas-preview\/[^/]+$/.test(pathname);
}

/**
 * Spremi scroll poziciju prije navigacije sa liste u detail.
 * Jedan scroll owner: VirtualList ILI root.
 * - virtualOffset > 0: VirtualList režim -> spremi { y: 0, l: offset }. Restore samo list.
 * - inače: root režim -> spremi { y: rootScrollTop, l: 0 }. Restore samo root.
 */
export function saveScrollForList(listRouteKey: string, virtualOffset?: number): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const payload = virtualOffset != null && virtualOffset > 0
      ? JSON.stringify({ y: 0, l: Math.round(virtualOffset) })
      : JSON.stringify({ y: Math.round(getScrollTop()), l: 0 });
    sessionStorage.setItem(SCROLL_LIST_PREFIX + listRouteKey, payload);
  } catch (_) {}
}

/** Parsira raw sessionStorage vrijednost. */
function parseScrollPayload(raw: string): { y: number; virtualOffset?: number } | null {
  if (!raw) return null;
  try {
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw) as { y?: number; l?: number };
      const y = typeof parsed.y === 'number' && parsed.y >= 0 ? parsed.y : typeof parsed.w === 'number' ? parsed.w : 0;
      const virtualOffset = typeof parsed.l === 'number' && parsed.l >= 0 ? parsed.l : undefined;
      return { y, virtualOffset };
    }
    const y = parseInt(raw, 10);
    return !Number.isNaN(y) && y >= 0 ? { y } : null;
  } catch {
    return null;
  }
}

/**
 * Učita spremljenu scroll poziciju bez brisanja. Vraća null ako nema.
 * Koristi se za restore; clearListScroll treba pozvati nakon uspješnog restore-a.
 */
export function loadScrollForList(listRouteKey: string): { y: number; virtualOffset?: number } | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SCROLL_LIST_PREFIX + listRouteKey);
    return parseScrollPayload(raw || '');
  } catch {
    return null;
  }
}

/** Obriše spremljenu scroll poziciju. Pozvati tek nakon uspješnog restore-a. */
export function clearListScroll(listRouteKey: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SCROLL_LIST_PREFIX + listRouteKey);
  } catch {}
}

/**
 * Učita spremljenu scroll poziciju. Vraća null ako nema ili invalid.
 * Briše key nakon čitanja (restore samo jednom).
 * @deprecated Prefer loadScrollForList + clearListScroll nakon uspješnog restore-a.
 */
export function loadAndClearScrollForList(listRouteKey: string): { y: number; virtualOffset?: number } | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const key = SCROLL_LIST_PREFIX + listRouteKey;
    const raw = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return parseScrollPayload(raw || '');
  } catch {
    return null;
  }
}

/**
 * Primijeni restore nakon što je lista renderovana (double RAF).
 */
export function scheduleRestoreScroll(
  y: number,
  options?: { virtualListRef?: { current: { scrollTo: (offset: number) => void } | null }; virtualOffset?: number }
): void {
  const doRestore = () => {
    restoreScroll(y);
    if (options?.virtualListRef?.current && options.virtualOffset != null) {
      try {
        options.virtualListRef.current.scrollTo(Math.max(0, options.virtualOffset));
      } catch (_) {}
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(doRestore));
}
