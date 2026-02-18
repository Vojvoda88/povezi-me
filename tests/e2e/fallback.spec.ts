import { test, expect } from '@playwright/test';

test.skip(
  process.env.E2E_FALLBACK_TEST !== '1',
  'Pokreni ovaj test sa E2E_FALLBACK_TEST=1 i odgovarajućim backend/FE konfiguracijama.'
);

test('fallback DEMO oglasi ne navigiraju na detalj (bonus scenarij)', async ({ page }) => {
  // Pretpostavlja se da je aplikacija pokrenuta tako da /api/ads ne radi (npr. backend down),
  // i da frontend prikazuje DEMO_ADS sa onemogućenim linkovima.
  await page.goto('/marketplace');

  // Prvi oglas (DEMO) bi trebalo da bude prikazan.
  const firstCard = page.locator('[data-testid="ad-card"]').first();
  await expect(firstCard).toBeVisible();

  const initialUrl = page.url();
  await firstCard.click();

  // URL treba da ostane isti – nema navigacije na /oglas/:slug.
  await expect(page).toHaveURL(initialUrl);
});

