#!/usr/bin/env node
/**
 * Sigurna Prisma migrate deploy rutina.
 *
 * Pravila:
 * - Podrazumijevano se ne pokreće kad NODE_ENV nije "production"
 * - Za CI / lokalne eksperimente koristi ALLOW_NONPROD_MIGRATE=1
 *
 * Primjeri:
 *   NODE_ENV=production npm run migrate:deploy
 *   ALLOW_NONPROD_MIGRATE=1 npm run migrate:deploy
 */

const { spawn } = require('child_process');

const nodeEnv = process.env.NODE_ENV || 'development';
const allowNonProd = process.env.ALLOW_NONPROD_MIGRATE === '1';

if (nodeEnv !== 'production' && !allowNonProd) {
  console.error(
    `[migrate-deploy] Refusing to run "prisma migrate deploy" when NODE_ENV=${nodeEnv}. ` +
      'Set NODE_ENV=production ili ALLOW_NONPROD_MIGRATE=1 ako ste sigurni šta radite.'
  );
  process.exit(1);
}

console.log(
  `[migrate-deploy] Running "prisma migrate deploy" (NODE_ENV=${nodeEnv}, ALLOW_NONPROD_MIGRATE=${allowNonProd})`
);

const child = spawn('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

