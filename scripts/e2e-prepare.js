#!/usr/bin/env node
/**
 * Oslobodi portove za E2E prije pokretanja Playwright webServer.
 * Port 5175 = Vite za E2E, port 3001 = backend za E2E.
 * Bez ovoga, ako su 5173/3001 zauzeti, E2E server bi mogao koristiti druge portove i testovi bi bili flaky.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ports = [5175, 3001];

for (const port of ports) {
  const r = spawnSync('npx', ['kill-port', String(port)], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0 && r.status !== null) {
    console.warn(`[e2e-prepare] kill-port ${port} exited with ${r.status} (port možda nije bio zauzet).`);
  }
}

process.exit(0);
