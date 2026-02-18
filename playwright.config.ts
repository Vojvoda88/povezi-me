import { defineConfig, devices } from '@playwright/test';

/**
 * Fiksni port za E2E:
 * - frontend (Vite) uvijek na 5175 sa --strictPort (preko "npm run e2e:serve")
 * - backend na 3001
 * Ako je 5175 zauzet → server se neće podići i testovi deterministički padaju (nema fallbacka na 5176+).
 */
const E2E_PORT = 5175;
const E2E_BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: E2E_BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run e2e:serve',
    url: E2E_BASE_URL,
    timeout: 120_000,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === '1' || !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

