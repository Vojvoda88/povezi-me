import prisma from './prisma';
import { createNotification } from './notifications';

function getNum(obj: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  if (v == null) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function getStr(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/**
 * Za dani aktivni oglas pronađi sve spremljene pretrage koje odgovaraju i pošalji obavijest vlasnicima (osim vlasnika oglasa).
 * Poređenje: kategorija, potkategorija, cijena, lokacija, tipOglasa, tekst (q), make/model, vehicleSpecs, nekretnine.
 */
export async function notifySavedSearchesForAd(adId: string): Promise<void> {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: adId },
      select: {
        id: true,
        vlasnikId: true,
        kategorija: true,
        potkategorija: true,
        cijena: true,
        naslov: true,
        slug: true,
        opis: true,
        lokacija: true,
        tipOglasa: true,
        make: true,
        model: true,
        details: true,
        vehicleSpecs: true,
      },
    });
    if (!ad || ad.vlasnikId == null) return;

    const price = Number(ad.cijena);
    const details = (ad.details && typeof ad.details === 'object' ? ad.details : {}) as Record<string, unknown>;
    const vs = (ad.vehicleSpecs && typeof ad.vehicleSpecs === 'object' ? ad.vehicleSpecs : {}) as Record<string, unknown>;
    const adMake = ad.make ?? getStr(vs, 'marka');
    const adModel = ad.model ?? getStr(vs, 'model');
    const adGodiste = getNum(vs, 'godiste') ?? getNum(details, 'godiste');
    const adKilometraza = getNum(vs, 'kilometraza') ?? getNum(details, 'kilometraza');
    const adKvadratura = getNum(details, 'kvadratura');

    const searches = await prisma.savedSearch.findMany({
      select: { id: true, userId: true, naziv: true, query: true },
    });

    for (const row of searches) {
      if (row.userId === ad.vlasnikId) continue;
      const q = row.query as Record<string, unknown> | null;
      if (!q || typeof q !== 'object') continue;

      const kategorija = getStr(q, 'kategorija');
      if (kategorija != null && kategorija !== ad.kategorija) continue;

      const subcategory = getStr(q, 'subcategory');
      if (subcategory != null && subcategory !== (ad.potkategorija ?? '')) continue;

      const priceMin = q.priceMin != null ? Number(q.priceMin) : NaN;
      const priceMax = q.priceMax != null ? Number(q.priceMax) : NaN;
      if (!Number.isNaN(priceMin) && price < priceMin) continue;
      if (!Number.isNaN(priceMax) && price > priceMax) continue;

      const lokacija = getStr(q, 'lokacija');
      if (lokacija != null && ad.lokacija !== lokacija) continue;

      const tipOglasa = getStr(q, 'tipOglasa');
      const adTip = ad.tipOglasa ?? 'prodajem';
      if (tipOglasa != null) {
        if (adTip !== tipOglasa) continue;
      } else {
        if (adTip !== 'prodajem') continue;
      }

      const qText = getStr(q, 'q');
      if (qText != null && qText.length >= 2) {
        const naslov = (ad.naslov ?? '').toLowerCase();
        const opis = (ad.opis ?? '').toLowerCase();
        const terms = qText.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
        const matches = terms.some((t) => naslov.includes(t) || opis.includes(t));
        if (!matches) continue;
      }

      const make = getStr(q, 'make') ?? getStr(q, 'marka');
      if (make != null && (adMake ?? '').toLowerCase() !== make.toLowerCase()) continue;

      const model = getStr(q, 'model');
      if (model != null && (adModel ?? '').toLowerCase() !== model.toLowerCase()) continue;

      const gorivo = getStr(q, 'gorivo');
      if (gorivo != null && (getStr(vs, 'gorivo') ?? getStr(details, 'gorivo')) !== gorivo) continue;

      const mjenjac = getStr(q, 'mjenjac');
      if (mjenjac != null && (getStr(vs, 'mjenjac') ?? getStr(details, 'mjenjac')) !== mjenjac) continue;

      const stanje = getStr(q, 'stanje');
      if (stanje != null && (getStr(vs, 'stanje') ?? getStr(details, 'stanje')) !== stanje) continue;

      const godisteMin = q.godisteMin != null ? Number(q.godisteMin) : q.yearMin != null ? Number(q.yearMin) : NaN;
      const godisteMax = q.godisteMax != null ? Number(q.godisteMax) : q.yearMax != null ? Number(q.yearMax) : NaN;
      if (!Number.isNaN(godisteMin) && (adGodiste ?? 0) < godisteMin) continue;
      if (!Number.isNaN(godisteMax) && (adGodiste ?? 9999) > godisteMax) continue;

      const kmMin = q.kilometrazaMin != null ? Number(q.kilometrazaMin) : q.mileageMin != null ? Number(q.mileageMin) : NaN;
      const kmMax = q.kilometrazaMax != null ? Number(q.kilometrazaMax) : q.mileageMax != null ? Number(q.mileageMax) : NaN;
      if (!Number.isNaN(kmMin) && (adKilometraza ?? 0) < kmMin) continue;
      if (!Number.isNaN(kmMax) && (adKilometraza ?? 0) > kmMax) continue;

      const tipNekretnine = getStr(q, 'tip_nekretnine');
      if (tipNekretnine != null && getStr(details, 'tipNekretnine') !== tipNekretnine) continue;

      const kvadraturaMin = q.kvadraturaMin != null ? Number(q.kvadraturaMin) : NaN;
      if (!Number.isNaN(kvadraturaMin) && (adKvadratura ?? 0) < kvadraturaMin) continue;

      const brojSoba = getStr(q, 'broj_soba');
      if (brojSoba != null && getStr(details, 'brojSoba') !== brojSoba) continue;

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
