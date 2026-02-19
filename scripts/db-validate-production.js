#!/usr/bin/env node
/**
 * Production DB validation – provjeri da li su migracije primijenjene i schema usklađena.
 *
 * Pokretanje:
 *   DATABASE_URL="postgresql://..." node scripts/db-validate-production.js
 *
 * Ili s production .env:
 *   node scripts/db-validate-production.js
 *
 * Validira:
 * - prisma migrate status (sve migracije primijenjene)
 * - AdStatus enum sadrži NA_CEKANJU
 * - Payment tabela postoji
 * - Report tabela postoji
 */

const { execSync } = require('child_process');
const path = require('path');

const cwd = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', ...opts });
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', code: e.status ?? 1 };
  }
}

async function validateWithPrisma() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  const results = { naCekanju: false, payment: false, report: false };

  try {
    await prisma.$queryRaw`SELECT 1 FROM "Ad" WHERE status = 'NA_CEKANJU' LIMIT 0`;
    results.naCekanju = true;
  } catch (e) {
    console.error('\x1b[31m✗\x1b[0m AdStatus.NA_CEKANJU:', e.message);
  }

  try {
    await prisma.payment.count();
    results.payment = true;
  } catch (e) {
    console.error('\x1b[31m✗\x1b[0m Payment tabela:', e.message);
  }

  try {
    await prisma.report.count();
    results.report = true;
  } catch (e) {
    console.error('\x1b[31m✗\x1b[0m Report tabela:', e.message);
  }

  await prisma.$disconnect();
  return results;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[db-validate] DATABASE_URL nije postavljen. Postavi env prije pokretanja.');
    process.exit(1);
  }

  console.log('[db-validate] Provjera migracija na bazi...\n');

  // 1. Prisma migrate status
  const statusResult = run('npx prisma migrate status', { stdio: 'pipe' });
  const statusStr = typeof statusResult === 'string'
    ? statusResult
    : (statusResult.stdout || statusResult.stderr || '');

  console.log(statusStr);

  if (statusStr.includes('database schema is up to date')) {
    console.log('\x1b[32m✓\x1b[0m Sve migracije primijenjene.\n');
  } else if (statusStr.includes('migrations pending') || statusStr.includes('following migration')) {
    console.error('\x1b[31m✗\x1b[0m Ima neprimijenjenih migracija. Pokreni: npm run migrate:deploy');
    process.exit(1);
  } else if (statusStr.includes('Error') || statusStr.includes('EPERM') || statusStr.includes('ECONNREFUSED')) {
    console.error('\x1b[31m✗\x1b[0m Greška pri povezivanju. Provjeri DATABASE_URL.');
    process.exit(1);
  }

  // 2. Provjera tabela i enum vrijednosti
  const r = await validateWithPrisma();

  if (!r.naCekanju) {
    console.error('\x1b[31m✗\x1b[0m AdStatus enum nema NA_CEKANJU. Pokreni migraciju 20260220000000.');
    process.exit(1);
  }
  if (!r.payment) {
    console.error('\x1b[31m✗\x1b[0m Payment tabela ne postoji. Pokreni migraciju 20260216100000.');
    process.exit(1);
  }
  if (!r.report) {
    console.error('\x1b[31m✗\x1b[0m Report tabela ne postoji. Pokreni migraciju 20260216000000.');
    process.exit(1);
  }

  console.log('\x1b[32m✓\x1b[0m AdStatus.NA_CEKANJU postoji.');
  console.log('\x1b[32m✓\x1b[0m Payment tabela postoji.');
  console.log('\x1b[32m✓\x1b[0m Report tabela postoji.');
  console.log('\n\x1b[32mProdukcijska baza usklađena sa schema.\x1b[0m');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
