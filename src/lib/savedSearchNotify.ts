import prisma from './prisma';
import { createNotification } from './notifications';

/**
 * Za dani aktivni oglas pronađi sve spremljene pretrage koje odgovaraju i pošalji obavijest vlasnicima (osim vlasnika oglasa).
 */
export async function notifySavedSearchesForAd(adId: string): Promise<void> {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: { id: true, vlasnikId: true, kategorija: true, potkategorija: true, cijena: true, naslov: true, slug: true },
    });
    if (!ad || ad.vlasnikId == null) return;

    const price = Number(ad.cijena);
    const searches = await prisma.savedSearch.findMany({
      select: { id: true, userId: true, naziv: true, query: true },
    });

    for (const row of searches) {
      if (row.userId === ad.vlasnikId) continue;
      const q = row.query as Record<string, unknown> | null;
      if (!q || typeof q !== 'object') continue;
      const kategorija = q.kategorija as string | undefined;
      if (kategorija != null && kategorija !== ad.kategorija) continue;
      const subcategory = q.subcategory as string | undefined;
      if (subcategory != null && subcategory !== (ad.potkategorija ?? '')) continue;
      const priceMin = q.priceMin != null ? Number(q.priceMin) : NaN;
      const priceMax = q.priceMax != null ? Number(q.priceMax) : NaN;
      if (!Number.isNaN(priceMin) && price < priceMin) continue;
      if (!Number.isNaN(priceMax) && price > priceMax) continue;

      const naziv = row.naziv || 'Spremljena pretraga';
      await createNotification(
        row.userId,
        'SAVED_SEARCH_MATCH',
        'Novi oglas odgovara vašoj pretrazi',
        `"${ad.naslov}" odgovara pretrazi "${naziv}".`,
        `/oglas/${ad.slug}`,
        ad.id
      );
    }
  } catch (err) {
    console.error('[notifySavedSearchesForAd]', err);
  }
}
