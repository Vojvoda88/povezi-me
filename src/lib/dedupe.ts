import crypto from 'crypto';

const DIACRITICS: Record<string, string> = {
  'č': 'c', 'ć': 'c', 'đ': 'd', 'š': 's', 'ž': 'z',
  'Č': 'c', 'Ć': 'c', 'Đ': 'd', 'Š': 's', 'Ž': 'z',
};

/** Normalize title: lowercase, trim, collapse whitespace, remove punctuation, remove diacritics */
export function normalizeTitle(title: string): string {
  if (!title || typeof title !== 'string') return '';
  let s = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '') // remove punctuation (keep letters + numbers)
    .replace(/./g, (c) => DIACRITICS[c] ?? c);
  return s.trim();
}

/** Normalize location (grad) – lowercase, trim, collapse whitespace, remove diacritics */
export function normalizeLocation(loc: string): string {
  if (!loc || typeof loc !== 'string') return '';
  let s = loc
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/./g, (c) => DIACRITICS[c] ?? c);
  return s.trim();
}

/** Price bucket: round to nearest 10 */
export function priceBucket(price: number): number {
  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) return 0;
  return Math.round(price / 10) * 10;
}

export interface DedupeInput {
  userId: string;
  kategorija: string;
  potkategorija?: string | null;
  naslov: string;
  lokacija: string;
  cijena: number;
  make?: string | null;
  model?: string | null;
  makeId?: string | null;
  modelId?: string | null;
  vehicleSpecs?: Record<string, unknown> | null;
}

/**
 * Compute dedupe fingerprint.
 * Input string: userId|kategorija|potkategorija|titleNorm|locationNorm|priceBucket|make|model|makeId|modelId|year
 */
export function computeDedupeKey(input: DedupeInput): string {
  const titleNorm = normalizeTitle(input.naslov);
  const locationNorm = normalizeLocation(input.lokacija);
  const bucket = priceBucket(input.cijena);
  const sub = input.potkategorija ?? '';
  const make = (input.make ?? input.makeId ?? '').toString();
  const model = (input.model ?? input.modelId ?? '').toString();
  const makeId = (input.makeId ?? '').toString();
  const modelId = (input.modelId ?? '').toString();
  const year = extractYear(input.vehicleSpecs);

  const parts = [
    input.userId,
    input.kategorija,
    sub,
    titleNorm,
    locationNorm,
    String(bucket),
    make,
    model,
    makeId,
    modelId,
    year,
  ];
  const payload = parts.join('|');
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

function extractYear(specs: Record<string, unknown> | null | undefined): string {
  if (!specs || typeof specs !== 'object') return '';
  const y = specs.godiste ?? specs.godina ?? specs.year;
  if (y === undefined || y === null) return '';
  const n = typeof y === 'number' ? y : parseInt(String(y), 10);
  return Number.isNaN(n) ? '' : String(n);
}
