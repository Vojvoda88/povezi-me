/**
 * Primjer custom fetchera za import-ads.
 * Kopiraj ovaj fajl, preimenuj i prilagodi parse logiku za konkretan sajt.
 *
 * U config.json:
 *   "type": "custom",
 *   "modulePath": "scripts/fetchers/tvoj-sajt.js",
 *   "url": "https://...",
 *   "kategorija": "ostalo",
 *   "lokacija": "Crna Gora"
 */

async function fetchListings(config) {
  const url = config.url || 'https://example.com/listings';
  const res = await fetch(url, { headers: { 'User-Agent': 'PoveziME-Import/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();

  // Primjer: ako stranica ima blokove sa klasom .listing, izvuci naslov, link, cijenu.
  // Prilagodi selektore/regex za stvarni sajt.
  const listings = [];
  const itemRegex = /<a[^>]+class="[^"]*listing[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  let idx = 0;
  while ((m = itemRegex.exec(html)) !== null) {
    const link = m[1];
    const block = m[2];
    const titleMatch = block.match(/<h[23][^>]*>([^<]+)</) || block.match(/title["']?\s*[:=]\s*["']?([^"']+)/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : `Oglas ${idx + 1}`;
    const priceMatch = block.match(/(\d[\d\s.,]*)\s*€|eur/i) || block.match(/cijena["']?\s*[:=]\s*["']?(\d+)/i);
    const cijena = priceMatch ? parseFloat(priceMatch[1].replace(/\s/g, '').replace(',', '.')) || 0 : 0;
    const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
    const imageUrls = imgMatch ? [imgMatch[1]] : [];

    listings.push({
      externalId: link || `custom-${Date.now()}-${idx}`,
      naslov: title,
      opis: block.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000) || title,
      cijena,
      kategorija: config.kategorija || 'ostalo',
      lokacija: config.lokacija || 'Crna Gora',
      imageUrls: imageUrls.length ? imageUrls : undefined,
      sourceUrl: link ? (link.startsWith('http') ? link : new URL(link, url).href) : undefined,
    });
    idx++;
  }

  return listings;
}

module.exports = { fetchListings };
