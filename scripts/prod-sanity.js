#!/usr/bin/env node
/**
 * Prod sanity check za SEO i SPA fallback:
 * 1) robots.txt: 200 i sadrži "Sitemap:"
 * 2) sitemap.xml: 200
 * 3) Prvi <loc> iz sitemap-a → GET na PUBLIC_SITE_URL (frontend ruta) ne smije biti 404.
 *
 * Potrebne varijable:
 * - API_PUBLIC_URL   (npr. https://api.povezi.me)
 * - PUBLIC_SITE_URL  (npr. https://povezi.me)
 */

const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || process.env.BACKEND_URL || '').replace(/\/$/, '');
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || '').replace(/\/$/, '');

if (!API_PUBLIC_URL || !PUBLIC_SITE_URL) {
  console.error('✗ API_PUBLIC_URL i PUBLIC_SITE_URL moraju biti postavljeni za prod:sanity.');
  process.exit(1);
}

async function main() {
  let failed = 0;

  const robotsUrl = `${API_PUBLIC_URL}/robots.txt`;
  const sitemapUrl = `${API_PUBLIC_URL}/sitemap.xml`;

  console.log('=== prod:sanity ===');
  console.log('API_PUBLIC_URL:', API_PUBLIC_URL);
  console.log('PUBLIC_SITE_URL:', PUBLIC_SITE_URL);
  console.log('');

  // 1) robots.txt
  try {
    const res = await fetch(robotsUrl);
    const text = await res.text();
    if (res.ok && /Sitemap:/i.test(text)) {
      console.log('✓ robots.txt:', robotsUrl);
    } else {
      console.log('✗ robots.txt:', robotsUrl, 'status=', res.status);
      failed++;
    }
  } catch (err) {
    console.log('✗ robots.txt fetch error:', err instanceof Error ? err.message : String(err));
    failed++;
  }

  // 2) sitemap.xml
  let sitemapText = '';
  try {
    const res = await fetch(sitemapUrl);
    sitemapText = await res.text();
    if (res.ok && sitemapText.includes('<urlset')) {
      console.log('✓ sitemap.xml:', sitemapUrl);
    } else {
      console.log('✗ sitemap.xml:', sitemapUrl, 'status=', res.status);
      failed++;
    }
  } catch (err) {
    console.log('✗ sitemap.xml fetch error:', err instanceof Error ? err.message : String(err));
    failed++;
  }

  // 3) Prvi <loc> URL → GET na frontend
  let firstLoc = null;
  const locMatch = sitemapText.match(/<loc>([^<]+)<\/loc>/i);
  if (locMatch && locMatch[1]) {
    firstLoc = locMatch[1].trim();
  }

  if (!firstLoc) {
    console.log('✗ sitemap.xml ne sadrži <loc> URL-ove.');
    failed++;
  } else {
    try {
      const res = await fetch(firstLoc, { redirect: 'manual' });
      if (res.status === 404) {
        console.log('✗ Frontend URL iz sitemap-a vraća 404:', firstLoc);
        failed++;
      } else {
        console.log('✓ Frontend URL iz sitemap-a izgleda ispravno:', firstLoc, '(status', res.status, ')');
      }
    } catch (err) {
      console.log('✗ Greška pri provjeri frontend URL-a iz sitemap-a:', err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  console.log('\n=== Rezultat prod:sanity:', failed === 0 ? 'PASS' : `FAIL (${failed} problema)` , '===\n');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('prod:sanity fatal error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

