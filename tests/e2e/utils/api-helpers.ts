import type { APIRequestContext } from '@playwright/test';

const DEFAULT_API_BASE = process.env.E2E_API_BASE || 'http://localhost:3001/api';

export function getApiBase(): string {
  return DEFAULT_API_BASE.replace(/\/+$/, '');
}

export interface TestUser {
  email: string;
  password: string;
  ime: string;
  telefon: string;
}

export async function createTestUser(request: APIRequestContext, overrides?: Partial<TestUser>): Promise<TestUser> {
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const user: TestUser = {
    email: overrides?.email ?? `e2e+${unique}@example.com`,
    password: overrides?.password ?? 'Test1234!',
    ime: overrides?.ime ?? 'E2E Korisnik',
    telefon: overrides?.telefon ?? '060123456',
  };

  const base = getApiBase();
  const res = await request.post(`${base}/auth/register`, {
    data: {
      ime: user.ime,
      email: user.email,
      password: user.password,
      telefon: user.telefon,
    },
  });

  // Ako je email već u upotrebi (ponovni run), pokušaj login umjesto faila.
  if (res.status() !== 201 && res.status() !== 400) {
    throw new Error(`Failed to create test user (${res.status()}): ${await res.text()}`);
  }

  return user;
}

export async function loginAndGetToken(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const base = getApiBase();
  const res = await request.post(`${base}/auth/login`, {
    data: { email, password },
  });
  if (res.status() !== 200) {
    throw new Error(`Login failed (${res.status()}): ${await res.text()}`);
  }
  const body = (await res.json()) as { accessToken?: string };
  if (!body.accessToken) {
    throw new Error('Login response missing accessToken');
  }
  return body.accessToken;
}

export interface TestAdInput {
  naslov: string;
  opis: string;
  cijena: number;
  kategorija: string;
  lokacija: string;
}

export interface TestAd {
  id: string;
  slug: string;
  naslov: string;
}

export async function createTestAd(
  request: APIRequestContext,
  token: string,
  overrides?: Partial<TestAdInput>
): Promise<TestAd> {
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const base = getApiBase();
  const ad: TestAdInput = {
    naslov: overrides?.naslov ?? `E2E Oglas ${unique}`,
    opis: overrides?.opis ?? 'Minimalni opis oglasa za E2E test (10+ karaktera).',
    cijena: overrides?.cijena ?? 1234,
    kategorija: overrides?.kategorija ?? 'automobili',
    lokacija: overrides?.lokacija ?? 'Podgorica',
  };

  const res = await request.post(`${base}/ads`, {
    data: ad,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status() !== 201 && res.status() !== 200) {
    throw new Error(`Failed to create test ad (${res.status()}): ${await res.text()}`);
  }

  const body = (await res.json()) as { id?: string; slug?: string; naslov?: string };
  if (!body.id || !body.slug || !body.naslov) {
    throw new Error('Create ad response missing id/slug/naslov');
  }

  return { id: body.id, slug: body.slug, naslov: body.naslov };
}

