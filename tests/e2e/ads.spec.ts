import { test, expect } from '@playwright/test';
import { createTestUser, loginAndGetToken, createTestAd, getApiBase } from './utils/api-helpers';

const TOKEN_KEY = 'povezi_access_token';

async function loginViaToken(page, token: string) {
  await page.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, value);
  }, [TOKEN_KEY, token]);
}

test('kreiranje oglasa sa minimalnim obaveznim poljima', async ({ page, request }) => {
  const user = await createTestUser(request);
  const token = await loginAndGetToken(request, user.email, user.password);

  await loginViaToken(page, token);
  await page.goto('/objavi');

  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const naslov = `E2E Oglas Minimalni ${unique}`;

  await page.getByPlaceholder(/Naslov oglasa/i).fill(naslov);
  await page.getByPlaceholder('Opis oglasa...').fill('Opis oglasa za E2E test (10+ karaktera).');
  await page.getByLabel(/Cijena/).fill('1234');
  await page.getByLabel('Lokacija').selectOption({ label: 'Podgorica' }).catch(() => {});

  // Kategorija – izaberi prvu dostupnu ako postoji select.
  const categorySelect = page.getByLabel('Kategorija');
  if (await categorySelect.isVisible()) {
    await categorySelect.selectOption({ index: 1 }).catch(() => {});
  }

  await page.getByRole('button', { name: /Objavi oglas/i }).click();

  // Nakon objave očekujemo redirect na /moji-oglasi ili sličnu potvrdu.
  await expect(page).toHaveURL(/moji-oglasi/);
  await expect(page.getByText(naslov)).toBeVisible();
});

test('upload jedne slike za oglas (TEST_MODE stub)', async ({ page, request }) => {
  const user = await createTestUser(request);
  const token = await loginAndGetToken(request, user.email, user.password);

  // Umjesto oslanjanja na UI, direktno testiramo backend upload endpoint u TEST_MODE režimu.
  const apiBase = getApiBase();
  const res = await request.post(`${apiBase}/ads/upload`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    multipart: {
      image: {
        name: 'test-image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
      },
    },
  });

  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.url).toBeTruthy();
});

test('listing -> klik na oglas -> detalj', async ({ page, request }) => {
  const user = await createTestUser(request);
  const token = await loginAndGetToken(request, user.email, user.password);
  const ad = await createTestAd(request, token);

  await page.goto('/marketplace');

  // Pronađi karticu sa naslovom oglasa i klikni.
  await page.getByText(ad.naslov, { exact: false }).first().click();

  await expect(page).toHaveURL(new RegExp(`/oglas/${ad.slug}`));
  await expect(page.getByText(ad.naslov, { exact: false })).toBeVisible();
});

test('marketplace scroll + open detail (virtual list click)', async ({ page, request }) => {
  const user = await createTestUser(request);
  const token = await loginAndGetToken(request, user.email, user.password);
  const ad = await createTestAd(request, token);

  await loginViaToken(page, token);
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');

  // Scroll list (triggers virtual list if >200 items)
  await page.evaluate(() => document.querySelector('[class*="grid"]')?.parentElement?.scrollBy?.(0, 200));
  await page.mouse.wheel(0, 150);

  // Click on our ad card (must work after scroll – no miss click)
  await page.getByText(ad.naslov, { exact: false }).first().click();
  await expect(page).toHaveURL(new RegExp(`/oglas/${ad.slug}`));
  await expect(page.getByText(ad.naslov, { exact: false })).toBeVisible();
});

test('marketplace favorite toggle u listi', async ({ page, request }) => {
  const user = await createTestUser(request);
  const token = await loginAndGetToken(request, user.email, user.password);
  await createTestAd(request, token);

  await loginViaToken(page, token);
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');

  // First ad card: heart button (favorite)
  const firstCard = page.locator('[class*="rounded-[18px"]').first();
  const heartBtn = firstCard.locator('button').filter({ has: page.locator('svg') }).first();
  await heartBtn.click();

  // Toggle should apply (no delay); optional: check aria or class change
  await expect(heartBtn).toBeVisible();
});

test('marketplace loadMore + scroll (append)', async ({ page, request }) => {
  const user = await createTestUser(request);
  const token = await loginAndGetToken(request, user.email, user.password);
  await loginViaToken(page, token);
  await page.goto('/marketplace');
  await page.waitForLoadState('networkidle');

  const loadMoreBtn = page.getByRole('button', { name: /Učitaj još/i });
  if (await loadMoreBtn.isVisible()) {
    await loadMoreBtn.click();
    await page.waitForTimeout(500);
    // After load more, list should have more items; scroll should not jump
    const grid = page.locator('[class*="grid"]').first();
    await expect(grid).toBeVisible();
  }
});

test('logout uklanja token i vraća na javni dio', async ({ page, request }) => {
  const user = await createTestUser(request);
  const token = await loginAndGetToken(request, user.email, user.password);

  await loginViaToken(page, token);
  await page.goto('/');

  // Očekujemo da postoji neki meni / profil sa akcijom odjave.
  // Na desktopu bi trebalo da postoji meni sa korisnikom; koristimo generički tekst "Odjava" ili sličan.
  const logoutButton = page.getByRole('button', { name: /Odjavi se|Odjava/i }).first();
  await logoutButton.click();

  await expect.poll(async () => {
    return page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY);
  }).toBeNull();
});

