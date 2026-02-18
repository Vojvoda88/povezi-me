#!/usr/bin/env node
/**
 * Cleanup job za oglase sa deletedAt != null (soft delete → storage delete → hard delete).
 *
 * Env:
 * - CLEANUP_ENABLED=true      (obavezno da bi se pokrenulo)
 * - CLEANUP_DRY_RUN=true|false (default: true)
 * - CLEANUP_DAYS=7            (koliko dana nakon deletedAt)
 *
 * Log format: JSON po oglasu:
 * { adId, imageCount, deletedFiles, success, error }
 */

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const CLEANUP_ENABLED = process.env.CLEANUP_ENABLED === 'true';
if (!CLEANUP_ENABLED) {
  console.log(
    JSON.stringify({
      event: 'cleanup_images_disabled',
      message: 'CLEANUP_ENABLED nije true – izlazim.',
      timestamp: new Date().toISOString(),
    })
  );
  process.exit(0);
}

const DRY_RUN = process.env.CLEANUP_DRY_RUN !== 'false'; // default: true
const DAYS = parseInt(process.env.CLEANUP_DAYS || '7', 10);

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const BUCKET_ADS = 'ads';

const prisma = new PrismaClient();
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

function extractStoragePath(publicUrl) {
  try {
    const u = new URL(publicUrl);
    const prefix = '/storage/v1/object/public/';
    const idx = u.pathname.indexOf(prefix);
    if (idx === -1) return null;
    const rest = u.pathname.slice(idx + prefix.length); // bucket/path...
    const firstSlash = rest.indexOf('/');
    if (firstSlash === -1) return null;
    const bucket = rest.slice(0, firstSlash);
    const objectPath = rest.slice(firstSlash + 1);
    if (!objectPath || bucket !== BUCKET_ADS) return null;
    return objectPath;
  } catch {
    return null;
  }
}

async function main() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS);

  const ads = await prisma.ad.findMany({
    where: {
      deletedAt: {
        not: null,
        lt: cutoff,
      },
    },
    include: {
      images: true,
    },
  });

  if (!ads.length) {
    console.log(
      JSON.stringify({
        event: 'cleanup_images_no_ads',
        count: 0,
        days: DAYS,
        dryRun: DRY_RUN,
        timestamp: new Date().toISOString(),
      })
    );
    await prisma.$disconnect();
    process.exit(0);
  }

  for (const ad of ads) {
    const paths = [];
    for (const img of ad.images) {
      if (img.url) {
        const p = extractStoragePath(img.url);
        if (p) paths.push(p);
      }
      if (img.thumbUrl) {
        const p = extractStoragePath(img.thumbUrl);
        if (p) paths.push(p);
      }
    }

    let success = true;
    let error = null;

    if (!DRY_RUN && supabase && paths.length) {
      try {
        await supabase.storage.from(BUCKET_ADS).remove(paths);
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
      }
    }

    if (!DRY_RUN && success) {
      try {
        await prisma.adImage.deleteMany({ where: { adId: ad.id } });
        await prisma.ad.delete({ where: { id: ad.id } });
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
      }
    }

    console.log(
      JSON.stringify({
        event: 'cleanup_ad',
        adId: ad.id,
        imageCount: ad.images.length,
        deletedFiles: paths.length,
        dryRun: DRY_RUN,
        success,
        error,
        timestamp: new Date().toISOString(),
      })
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'cleanup_images_fatal',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    })
  );
  process.exit(1);
});

