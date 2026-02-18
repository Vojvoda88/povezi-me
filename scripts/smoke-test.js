#!/usr/bin/env node
/**
 * Smoke test – provjeri da API i ad detail flow rade.
 *
 * Konfiguracija baze URL-a:
 * - Lokalno: koristi default http://localhost:3001 (npm run dev / npm run backend)
 * - Preko env:
 *   - SMOKE_BASE_URL – preporučeno (npr. https://api.example.com)
 *   - API_BASE       – legacy podrška (npr. http://localhost:3000)
 *
 * Primjeri:
 *   SMOKE_BASE_URL=http://localhost:3001 node scripts/smoke-test.js
 *   SMOKE_BASE_URL=https://api.povezi.me node scripts/smoke-test.js
 */
const BASE =
  process.env.SMOKE_BASE_URL ||
  process.env.API_BASE ||
  'http://localhost:3001';

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, ok: res.ok, json, text: text.slice(0, 200) };
}

async function main() {
  console.log('=== Povezi.ME Smoke Test ===\n');
  console.log('API Base:', BASE);

  let failed = 0;

  // 1. Health
  const health = await fetchJson(`${BASE}/health`);
  if (health.ok) {
    console.log('[OK] GET /health ->', health.status);
  } else {
    console.log('[FAIL] GET /health ->', health.status);
    failed++;
  }

  // 2. Listing
  const listing = await fetchJson(`${BASE}/api/ads?page=1&limit=3`);
  if (!listing.ok) {
    console.log('[FAIL] GET /api/ads ->', listing.status);
    failed++;
  } else {
    console.log('[OK] GET /api/ads ->', listing.status);
    const ads = listing.json?.ads ?? (Array.isArray(listing.json) ? listing.json : []);
    if (ads.length === 0) {
      console.log('[WARN] Listing prazan – nema oglasa za test detalja.');
    } else {
      const slug = ads[0].slug;
      if (!slug) {
        console.log('[FAIL] Prvi oglas nema slug:', ads[0]);
        failed++;
      } else {
        // 3. Detail by slug
        const detail = await fetchJson(`${BASE}/api/ads/${encodeURIComponent(slug)}`);
        if (detail.ok) {
          console.log('[OK] GET /api/ads/' + slug + ' -> 200');
        } else {
          console.log('[FAIL] GET /api/ads/' + slug + ' ->', detail.status, detail.text);
          failed++;
        }
      }
    }
  }

  console.log('\n=== Rezultat: ' + (failed === 0 ? 'SVE OK' : failed + ' GREŠAKA') + ' ===');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Smoke test error:', err.message);
  process.exit(1);
});
