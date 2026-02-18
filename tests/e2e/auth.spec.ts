import { test, expect } from '@playwright/test';
import { createTestUser, loginAndGetToken } from './utils/api-helpers';

const TOKEN_KEY = 'povezi_access_token';

test('registracija novog korisnika preko UI', async ({ page }) => {
  await page.goto('/');

  // Otvori formu za prijavu, zatim link ka registraciji.
  await page.getByRole('link', { name: 'Prijavi se' }).first().click();
  await expect(page).toHaveURL(/\/prijava/);

  await page.getByRole('link', { name: 'Registrujte se' }).click();
  await expect(page).toHaveURL(/\/registracija/);

  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const email = `e2e-reg-${unique}@example.com`;

  await page.getByLabel('Ime i prezime').fill('E2E Registracija');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Telefon').fill('060123456');
  await page.getByLabel('Lozinka').fill('Test1234!');

  await page.getByRole('button', { name: /Registracija/i }).click();

  // Nakon uspješne registracije korisnik treba biti logovan (token u localStorage).
  await expect.poll(async () => {
    return page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY);
  }).not.toBeNull();
});

test('login postojećeg korisnika preko UI', async ({ page, request }) => {
  const user = await createTestUser(request);

  await page.goto('/');
  await page.getByRole('link', { name: 'Prijavi se' }).first().click();
  await expect(page).toHaveURL(/\/prijava/);

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Lozinka').fill(user.password);
  await page.getByRole('button', { name: /Prijava/i }).click();

  await expect.poll(async () => {
    return page.evaluate((key) => window.localStorage.getItem(key), TOKEN_KEY);
  }).not.toBeNull();
});

