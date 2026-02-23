#!/usr/bin/env node
/**
 * Briše orphan tmp fajlove iz Supabase Storage (uploadovani ali nikad priloženi oglasu).
 * Tmp fajlovi stariji od TMP_MAX_AGE_HOURS (default 24) se brišu.
 *
 * Env:
 * - CLEANUP_ORPHAN_TMP_ENABLED=true  (obavezno)
 * - CLEANUP_ORPHAN_TMP_DRY_RUN=true|false (default: true)
 * - TMP_MAX_AGE_HOURS=24
 *
 * npm run cleanup:orphan-tmp
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ENABLED = process.env.CLEANUP_ORPHAN_TMP_ENABLED === 'true';
if (!ENABLED) {
  console.log(
    JSON.stringify({
      event: 'cleanup_orphan_tmp_disabled',
      message: 'CLEANUP_ORPHAN_TMP_ENABLED nije true – izlazim.',
      timestamp: new Date().toISOString(),
    })
  );
  process.exit(0);
}

const DRY_RUN = process.env.CLEANUP_ORPHAN_TMP_DRY_RUN !== 'false';
const MAX_AGE_HOURS = parseInt(process.env.TMP_MAX_AGE_HOURS || '24', 10);
const BUCKET_ADS = 'ads';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : null;

if (!supabase) {
  console.log(
    JSON.stringify({
      event: 'cleanup_orphan_tmp_no_supabase',
      message: 'SUPABASE_URL i SUPABASE_SERVICE_KEY su obavezni.',
      timestamp: new Date().toISOString(),
    })
  );
  process.exit(1);
}

const cutoff = new Date();
cutoff.setHours(cutoff.getHours() - MAX_AGE_HOURS);

async function listAllInFolder(path) {
  const all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_ADS)
      .list(path, { limit, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

async function collectOldTmpFiles(prefix, allOld) {
  const items = await listAllInFolder(prefix);
  for (const item of items) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      if (item.name === 'tmp') {
        const files = await listAllInFolder(fullPath);
        for (const f of files) {
          if (f.id == null) continue;
          const filePath = `${fullPath}/${f.name}`;
          const createdAt = f.created_at ? new Date(f.created_at) : null;
          if (createdAt && createdAt < cutoff) {
            allOld.push(filePath);
          }
        }
      } else {
        await collectOldTmpFiles(fullPath, allOld);
      }
    }
  }
}

async function main() {
  const oldPaths = [];
  const topLevel = await listAllInFolder('');
  for (const item of topLevel) {
    if (item.id === null) {
      await collectOldTmpFiles(item.name, oldPaths);
    }
  }

  if (!oldPaths.length) {
    console.log(
      JSON.stringify({
        event: 'cleanup_orphan_tmp_done',
        deleted: 0,
        dryRun: DRY_RUN,
        maxAgeHours: MAX_AGE_HOURS,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  if (!DRY_RUN) {
    const batchSize = 100;
    for (let i = 0; i < oldPaths.length; i += batchSize) {
      const batch = oldPaths.slice(i, i + batchSize);
      const { error } = await supabase.storage.from(BUCKET_ADS).remove(batch);
      if (error) {
        console.error(
          JSON.stringify({
            event: 'cleanup_orphan_tmp_error',
            batchStart: i,
            count: batch.length,
            error: error.message,
            timestamp: new Date().toISOString(),
          })
        );
      }
    }
  }

  console.log(
    JSON.stringify({
      event: 'cleanup_orphan_tmp_done',
      deleted: oldPaths.length,
      dryRun: DRY_RUN,
      maxAgeHours: MAX_AGE_HOURS,
      timestamp: new Date().toISOString(),
    })
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      event: 'cleanup_orphan_tmp_fatal',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    })
  );
  process.exit(1);
});
