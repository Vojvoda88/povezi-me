/**
 * In-memory throttle: same user or IP cannot increment view more than 1x per 30 min per ad.
 */
const VIEW_THROTTLE_MS = 30 * 60 * 1000; // 30 min
const cache = new Map<string, number>();

function prune(): void {
  const now = Date.now();
  for (const [k, ts] of cache.entries()) {
    if (now - ts > VIEW_THROTTLE_MS) cache.delete(k);
  }
}

export function shouldIncrementView(slug: string, userId: string | null, ip: string | undefined): boolean {
  const key = `${slug}:${userId ?? 'anon'}:${ip ?? 'unknown'}`;
  const now = Date.now();
  const last = cache.get(key);
  if (last != null && now - last < VIEW_THROTTLE_MS) return false;
  if (cache.size > 100_000) prune();
  cache.set(key, now);
  return true;
}
