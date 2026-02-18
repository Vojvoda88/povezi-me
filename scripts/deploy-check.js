#!/usr/bin/env node
/**
 * Pre-deploy provjera – verificira da li je sve spremno za produkciju.
 * Pokretanje: node scripts/deploy-check.js
 */
const fs = require('fs');
const path = require('path');

let errors = 0;
const cwd = path.resolve(__dirname, '..');

function check(name, ok, msg) {
  const status = ok ? '✓' : '✗';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}: ${msg}`);
  if (!ok) errors++;
}

// .env ne smije biti u gitu
try {
  const gitignore = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8');
  check('.gitignore', gitignore.includes('.env'), '.env je u .gitignore');
} catch {
  check('.gitignore', false, '.gitignore nije pronađen');
}

// Migracije postoje
const migrationsDir = path.join(cwd, 'prisma', 'migrations');
check('Migracije', fs.existsSync(migrationsDir), 'prisma/migrations postoji');

// package.json ima potrebne skripte
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
  const scripts = pkg.scripts || {};
  check('db:migrate', !!scripts['db:migrate'], 'npm run db:migrate dostupan');
  check('build', !!scripts.build, 'npm run build dostupan');
  check('build:frontend', !!scripts['build:frontend'], 'npm run build:frontend dostupan');
} catch {
  check('package.json', false, 'nije moguće pročitati');
}

// Env example postoji
check('.env.example', fs.existsSync(path.join(cwd, '.env.example')), 'postoji');

// Production DATABASE_URL – provjera ako .env postoji (ne učitavamo ga u runtime, samo provjeravamo postojanje i format)
const envPath = path.join(cwd, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/^\s*DATABASE_URL\s*=\s*["']?([^"'\s#]+)/m);
    const dbUrl = match ? match[1].trim() : '';
    const hasDb = dbUrl.length > 0;
    check('DATABASE_URL', hasDb, hasDb ? 'postavljen' : 'nije postavljen u .env');
    if (hasDb && process.env.NODE_ENV === 'production') {
      const looksLocal = /localhost|127\.0\.0\.1/.test(dbUrl);
      check('DATABASE_URL (prod)', !looksLocal, looksLocal ? 'izgleda kao lokalna baza – ne koristi za produkciju' : 'nije localhost (ok za prod)');
    }
  } catch {
    check('DATABASE_URL', false, 'nije moguće pročitati .env');
  }
} else {
  check('DATABASE_URL', true, '.env ne postoji – postavi na hostingu');
}

console.log('\n' + (errors === 0
  ? '\x1b[32mSve provjere prošle. Sljedeći korak: postavi env varijable na hostingu i pokreni db:migrate.\x1b[0m'
  : `\x1b[31m${errors} grešaka. Ispravi prije deploya.\x1b[0m`));
process.exit(errors > 0 ? 1 : 0);
