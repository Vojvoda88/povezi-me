import prisma from './prisma';

function buildDedupeKey(tip: string, userId: string, entityId?: string | null, milestone?: number | null): string {
  return `${tip}:${userId}:${entityId ?? 'none'}:${milestone ?? 'none'}`;
}

export async function createNotification(
  userId: string,
  tip: string,
  naslov: string,
  poruka: string,
  link?: string | null,
  entityId?: string | null,
  milestone?: number | null
): Promise<void> {
  const dedupeKey = buildDedupeKey(tip, userId, entityId, milestone);
  try {
    await prisma.notification.create({
      data: {
        userId,
        tip,
        naslov,
        poruka,
        link: link ?? undefined,
        entityId: entityId ?? undefined,
        milestone: milestone ?? undefined,
        dedupeKey,
      },
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'P2002') return; // unique violation -> ignore
    console.error('[createNotification]', err);
  }
}
