/**
 * Skripta za uvoz oglasa sa drugih sajtova (RSS, ili vlastiti parser).
 * Koristi "import" korisnika (kreira ga ako ne postoji).
 *
 * Napomena: Scraping može biti protiv ToS nekih sajtova. Koristi RSS/API gdje
 * je dostupan; inače provjeri robots.txt i uslove korištenja.
 *
 * Pokretanje:
 *   npx ts-node scripts/import-ads.ts
 *   npx ts-node scripts/import-ads.ts --config=path/to/config.json
 *
 * Env: DATABASE_URL (dotenv iz .env). Opciono IMPORT_USER_ID=... (cuid postojećeg korisnika).
 */

import 'dotenv/config';
import { PrismaClient, AdStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// --- Tipovi ---
export interface ImportListing {
  externalId: string;
  naslov: string;
  opis: string;
  cijena: number;
  kategorija: string;
  lokacija: string;
  imageUrls?: string[];
  sourceUrl?: string;
  make?: string;
  model?: string;
  potkategorija?: string;
  details?: Record<string, unknown>;
  vehicleSpecs?: Record<string, unknown>;
}

export interface ImportSourceConfig {
  name: string;
  type: 'rss' | 'custom';
  url?: string;
  kategorija?: string;
  lokacija?: string;
  /** Za type: 'custom' – putanja do .js modula koji exportuje fetchListings(config): Promise<ImportListing[]> */
  modulePath?: string;
}

export interface ImportConfig {
  importUserEmail?: string;
  defaultKategorija?: string;
  defaultLokacija?: string;
  sources: ImportSourceConfig[];
}

// --- Ugrađeni RSS fetcher (minimalan parser, bez dodatnih dependencija) ---
async function fetchFromRss(source: ImportSourceConfig): Promise<ImportListing[]> {
  const url = source.url;
  if (!url) {
    console.warn('[import] RSS source bez url:', source.name);
    return [];
  }
  const res = await fetch(url, { headers: { 'User-Agent': 'PoveziME-Import/1.0' } });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status} ${url}`);
  const xml = await res.text();

  const listings: ImportListing[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const desc = extractTag(block, 'description');
    const guid = extractTag(block, 'guid') || link || `rss-${listings.length}-${Date.now()}`;
    const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
    const imgFromDesc = desc ? (desc.match(/<img[^>]+src=["']([^"']+)["']/i) ?? null)?.[1] : null;
    const imageUrls = enclosure?.[1] ? [enclosure[1]] : imgFromDesc ? [imgFromDesc] : [];

    const priceMatch = (title + ' ' + desc).match(/(\d[\d\s.,]*)\s*€|eur|euro/i) ?? (desc || '').match(/(\d[\d\s.,]+)\s*€/i);
    const cijena = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.')) || 0 : 0;

    if (!title || title.length < 2) continue;

    listings.push({
      externalId: guid.trim().slice(0, 200),
      naslov: stripHtml(title).slice(0, 200),
      opis: stripHtml(desc || title).slice(0, 5000) || title,
      cijena,
      kategorija: source.kategorija ?? 'ostalo',
      lokacija: source.lokacija ?? 'Crna Gora',
      imageUrls: imageUrls.length ? imageUrls : undefined,
      sourceUrl: link || undefined,
    });
  }
  return listings;
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return (m[1] || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .trim();
}

// --- Dobavi ili kreiraj import korisnika ---
async function getOrCreateImportUser(config: ImportConfig): Promise<string> {
  const email = process.env.IMPORT_USER_ID
    ? null
    : (config.importUserEmail || 'import@povezi.me').trim();

  if (process.env.IMPORT_USER_ID) {
    const u = await prisma.user.findUnique({ where: { id: process.env.IMPORT_USER_ID } });
    if (u) return u.id;
    throw new Error('IMPORT_USER_ID nije validan – korisnik nije pronađen.');
  }

  let user = await prisma.user.findUnique({ where: { email: email! } });
  if (user) return user.id;

  const passwordHash = await bcrypt.hash('Import-User-No-Login-' + Date.now(), 10);
  user = await prisma.user.create({
    data: {
      ime: 'Import (sistemski)',
      email: email!,
      passwordHash,
      telefon: '+38200000000',
      role: Role.USER,
    },
  });
  console.log('Kreiran import korisnik:', user.email);
  return user.id;
}

// --- Uvoz jedne liste ---
async function importListings(
  source: ImportSourceConfig,
  listings: ImportListing[],
  userId: string,
  defaultKategorija: string,
  defaultLokacija: string
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  for (const row of listings) {
    const dedupeKey = `import:${source.name}:${row.externalId}`;
    const existing = await prisma.ad.findFirst({
      where: { dedupeKey, vlasnikId: userId },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const naslov = (row.naslov || 'Bez naslova').slice(0, 200);
    const slugBase = naslov.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'oglas';
    const slug = `${slugBase}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.ad.create({
      data: {
        naslov,
        slug,
        opis: (row.opis || naslov).slice(0, 5000),
        cijena: row.cijena,
        kategorija: row.kategorija || defaultKategorija,
        lokacija: row.lokacija || defaultLokacija,
        status: AdStatus.AKTIVAN,
        vlasnikId: userId,
        expiresAt,
        tipOglasa: 'prodajem',
        dedupeKey,
        make: row.make && String(row.make).trim() ? String(row.make).slice(0, 100) : undefined,
        model: row.model && String(row.model).trim() ? String(row.model).slice(0, 100) : undefined,
        potkategorija: row.potkategorija && String(row.potkategorija).trim() ? String(row.potkategorija).slice(0, 80) : undefined,
        details: row.details && typeof row.details === 'object' && !Array.isArray(row.details) ? (row.details as Record<string, unknown>) : undefined,
        vehicleSpecs: row.vehicleSpecs && typeof row.vehicleSpecs === 'object' && !Array.isArray(row.vehicleSpecs) ? (row.vehicleSpecs as Record<string, unknown>) : undefined,
        images:
          row.imageUrls && row.imageUrls.length > 0
            ? {
                create: row.imageUrls.slice(0, 10).map((url, i) => ({
                  url: url.slice(0, 2048),
                  thumbUrl: null,
                  order: i,
                })),
              }
            : undefined,
      },
    });
    created++;
  }

  return { created, skipped };
}

// --- Main ---
async function main() {
  const configPath =
    process.argv.find((a) => a.startsWith('--config='))?.split('=')[1] ||
    path.join(process.cwd(), 'scripts', 'import-ads.config.json');

  let config: ImportConfig;
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(raw) as ImportConfig;
  } catch (e) {
    console.error('Ne mogu učitati config:', configPath);
    console.error('Kopiraj scripts/import-ads.config.example.json u import-ads.config.json i prilagodi sources.');
    process.exit(1);
  }

  if (!config.sources || config.sources.length === 0) {
    console.error('Config nema sources.');
    process.exit(1);
  }

  const defaultKategorija = config.defaultKategorija ?? 'ostalo';
  const defaultLokacija = config.defaultLokacija ?? 'Crna Gora';

  const userId = await getOrCreateImportUser(config);

  for (const source of config.sources) {
    let listings: ImportListing[] = [];
    try {
      if (source.type === 'rss') {
        listings = await fetchFromRss(source);
      } else if (source.type === 'custom' && source.modulePath) {
        const mod = require(path.resolve(process.cwd(), source.modulePath));
        if (typeof mod.fetchListings !== 'function') throw new Error('Modul mora exportovati fetchListings(config)');
        listings = await mod.fetchListings(source);
      } else {
        console.warn('[import] Nepoznat tip ili nedostaje modulePath:', source.name);
        continue;
      }
    } catch (err) {
      console.error('[import] Greška za source', source.name, err);
      continue;
    }

    const { created, skipped } = await importListings(
      source,
      listings,
      userId,
      defaultKategorija,
      defaultLokacija
    );
    console.log(`[import] ${source.name}: ${created} novih, ${skipped} već postoji.`);
  }

  console.log('Završeno.');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
