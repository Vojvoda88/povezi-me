/**
 * Enterprise view throttle: DB-backed, multi-instance safe.
 * Same user/IP cannot increment view more than 1x per 30 min per ad.
 */
import prisma from './prisma';

const VIEW_THROTTLE_MS = 30 * 60 * 1000;
const CLEANUP_DAYS = 7;

export function viewThrottleKey(userId: string | null, ip: string | undefined): string {
  return userId ? `user:${userId}` : `ip:${ip ?? 'unknown'}`;
}

export async function canIncrementAndRecord(
  adId: string,
  key: string
): Promise<boolean> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - VIEW_THROTTLE_MS);

  const existing = await prisma.adViewThrottle.findUnique({
    where: { adId_key: { adId, key } },
  });
  if (existing) {
    if (existing.lastViewedAt >= cutoff) return false;
    await prisma.adViewThrottle.update({
      where: { adId_key: { adId, key } },
      data: { lastViewedAt: now },
    });
    return true;
  }
  try {
    await prisma.adViewThrottle.create({
      data: { adId, key, lastViewedAt: now },
    });
    return true;
  } catch {
    const row = await prisma.adViewThrottle.findUnique({
      where: { adId_key: { adId, key } },
    });
    if (row && row.lastViewedAt >= cutoff) return false;
    if (row) {
      await prisma.adViewThrottle.update({
        where: { adId_key: { adId, key } },
        data: { lastViewedAt: now },
      });
      return true;
    }
    return false;
  }
}

export async function cleanupOldThrottles(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CLEANUP_DAYS);
  const result = await prisma.adViewThrottle.deleteMany({
    where: { lastViewedAt: { lt: cutoff } },
  });
  return result.count;
}
