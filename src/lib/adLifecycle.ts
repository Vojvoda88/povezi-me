/**
 * Ad lifecycle: 50-day auto-delete, 43/47 day warnings.
 * Idempotent – safe to call on every relevant request (GET ads, GET notifications).
 * No cron dependency.
 */

import prisma from './prisma';
import { getSupabase, BUCKET_ADS } from './supabase';
import { createNotification } from './notifications';
import { cleanupOldThrottles } from './viewThrottleDb';

const INACTIVE_DAYS = 50;
const WARN_7D = 43;
const WARN_3D = 47;
const HARD_DELETE_AFTER_DAYS = 30;
const HARD_DELETE_BATCH = 50;

export async function runAdLifecycleCheck(): Promise<void> {
  const now = new Date();
  const cutoff50 = new Date(now);
  cutoff50.setDate(cutoff50.getDate() - INACTIVE_DAYS);
  const cutoff43 = new Date(now);
  cutoff43.setDate(cutoff43.getDate() - WARN_7D);
  const cutoff47 = new Date(now);
  cutoff47.setDate(cutoff47.getDate() - WARN_3D);

  try {
    // 1) Soft-delete ads where lastActivityAt + 50 days <= now
    const toDelete = await prisma.ad.findMany({
      where: {
        deletedAt: null,
        status: 'AKTIVAN',
        lastActivityAt: { lte: cutoff50 },
      },
      include: { images: true },
    });

    for (const ad of toDelete) {
      await prisma.ad.update({
        where: { id: ad.id },
        data: { deletedAt: now, status: 'ISTEKAO' },
      });
      // Delete images from storage
      const supabase = getSupabase();
      if (supabase && ad.images?.length) {
        for (const img of ad.images) {
          try {
            const path = img.url?.includes('/storage/v1/object/public/') ? extractStoragePath(img.url) : null;
            if (path) {
              await supabase.storage.from(BUCKET_ADS).remove([path]);
            }
          } catch {
            // ignore storage errors
          }
        }
      }
      await prisma.adImage.deleteMany({ where: { adId: ad.id } });
    }

    // 2) Create AD_DELETION_7D notifications (day 43) – dedupe
    const ads43 = await prisma.ad.findMany({
      where: {
        deletedAt: null,
        status: 'AKTIVAN',
        lastActivityAt: { lte: cutoff43 },
      },
      select: { id: true, naslov: true, slug: true, vlasnikId: true },
    });

    for (const ad of ads43) {
      await createNotification(
          ad.vlasnikId,
          'AD_DELETION_7D',
          'Oglas uskoro ističe',
          `Oglas "${ad.naslov}" će biti obrisan za 7 dana ako ga ne produžite. Kliknite "Produži" da ostane aktivan.`,
          `/moji-oglasi`,
          ad.id,
          43
        );
    }

    // 3) Create AD_DELETION_3D notifications (day 47)
    const ads47 = await prisma.ad.findMany({
      where: {
        deletedAt: null,
        status: 'AKTIVAN',
        lastActivityAt: { lte: cutoff47 },
      },
      select: { id: true, naslov: true, vlasnikId: true },
    });

    for (const ad of ads47) {
      await createNotification(
          ad.vlasnikId,
          'AD_DELETION_3D',
          'Oglas ističe uskoro',
          `Oglas "${ad.naslov}" će biti obrisan za 3 dana ako ga ne produžite. Kliknite "Produži" da ostane aktivan.`,
          `/moji-oglasi`,
          ad.id,
          47
        );
    }

    // 4) LOW_VIEWS_PROMO_SUGGESTION: ad <20 views, >5 days old, not premium
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const lowViewsAds = await prisma.ad.findMany({
      where: {
        deletedAt: null,
        status: 'AKTIVAN',
        pogledi: { lt: 20 },
        createdAt: { lt: fiveDaysAgo },
        OR: [{ featuredUntil: null }, { featuredUntil: { lt: now } }],
      },
      select: { id: true, naslov: true, slug: true, vlasnikId: true },
    });

    for (const ad of lowViewsAds) {
      await createNotification(
          ad.vlasnikId,
          'LOW_VIEWS_PROMO_SUGGESTION',
          'Premalo pregleda?',
          'Tvoj oglas ima malo pregleda. Aktiviraj Premium za veću vidljivost.',
          `/oglas/${ad.slug}`,
          ad.id,
          null
        );
    }

    // 5) PROMO_EXPIRING_SOON: premium ističe za 3 dana
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const promoExpiringAds = await prisma.ad.findMany({
      where: {
        deletedAt: null,
        status: 'AKTIVAN',
        featuredUntil: { gt: now, lte: threeDaysFromNow },
      },
      select: { id: true, naslov: true, slug: true, vlasnikId: true },
    });

    for (const ad of promoExpiringAds) {
      await createNotification(
          ad.vlasnikId,
          'PROMO_EXPIRING_SOON',
          'Premium ističe uskoro',
          'Premium promocija uskoro ističe. Produži je da zadržiš poziciju.',
          `/oglas/${ad.slug}`,
          ad.id,
          null
        );
    }
    // 6) Hard delete: ads with deletedAt > 30 days ago
    const hardCutoff = new Date(now);
    hardCutoff.setDate(hardCutoff.getDate() - HARD_DELETE_AFTER_DAYS);
    const hardDeleteStart = Date.now();
    const toHardDelete = await prisma.ad.findMany({
      where: { deletedAt: { lt: hardCutoff, not: null } },
      include: { images: true },
      take: HARD_DELETE_BATCH,
    });
    let hardDeletedCount = 0;
    let imagesDeletedCount = 0;
    for (const ad of toHardDelete) {
      try {
        const supabase = getSupabase();
        if (supabase && ad.images?.length) {
          for (const img of ad.images) {
            try {
              const path = img.url?.includes('/storage/v1/object/public/') ? extractStoragePath(img.url) : null;
              if (path) {
                await supabase.storage.from(BUCKET_ADS).remove([path]);
                imagesDeletedCount++;
              }
            } catch { /* ignore */ }
          }
        }
        await prisma.ad.delete({ where: { id: ad.id } });
        hardDeletedCount++;
      } catch {
        /* safe retry next run */
      }
    }
    if (process.env.NODE_ENV === 'production' && (hardDeletedCount > 0 || imagesDeletedCount > 0)) {
      const durationMs = Date.now() - hardDeleteStart;
      console.log(JSON.stringify({
        event: 'cleanup_hard_delete',
        adsDeleted: hardDeletedCount,
        imagesDeleted: imagesDeletedCount,
        durationMs,
      }));
    }

    try { await cleanupOldThrottles(); } catch { /* ignore */ }
  } catch (err) {
    console.error('[runAdLifecycleCheck]', err);
  }
}

function extractStoragePath(url: string): string | null {
  try {
    // URL: .../object/public/ads/userId/uuid.ext -> path within bucket: userId/uuid.ext
    const match = url.match(/\/object\/public\/[^/]+\/(.+)$/);
    if (!match) return null;
    const full = decodeURIComponent(match[1]);
    const prefix = BUCKET_ADS + '/';
    return full.startsWith(prefix) ? full.slice(prefix.length) : full;
  } catch {
    return null;
  }
}
