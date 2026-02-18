import type { Ad } from './types';

// Defanzivno mapiranje API payload-a u Ad model koji frontend koristi.
// Nikad ne baca exception – na lošim podacima loguje grešku i koristi fallbacks.
export const mapApiAdToAd = (raw: any): Ad => {
  if (!raw || typeof raw !== 'object') {
    console.error('[mapApiAdToAd] invalid payload, expected object but got', raw);
  }
  const a = (raw && typeof raw === 'object' ? raw : {}) as any;

  const detailsRaw = a.details;
  const details = detailsRaw && typeof detailsRaw === 'object'
    ? (detailsRaw as Record<string, unknown>)
    : undefined;
  const d = details as any | undefined;

  const realEstateDetails = a.kategorija === 'nekretnine' && d ? {
    tipNekretnine: typeof d.tipNekretnine === 'string' ? d.tipNekretnine : undefined,
    tipPonude: typeof d.tipPonude === 'string' ? (d.tipPonude as 'prodaja' | 'izdavanje' | undefined) : undefined,
    kvadratura: typeof d.kvadratura === 'number' ? d.kvadratura : undefined,
    brojSoba: typeof d.brojSoba === 'string' ? d.brojSoba : undefined,
    sprat: typeof d.sprat === 'string' ? d.sprat : undefined,
  } : undefined;

  let featuredUntil: number | null = null;
  if (a.featuredUntil) {
    const ts = new Date(a.featuredUntil as any).getTime();
    if (Number.isFinite(ts)) {
      featuredUntil = ts;
    } else {
      console.error('[mapApiAdToAd] invalid featuredUntil', a.featuredUntil);
    }
  }
  const now = Date.now();
  const isPremium = featuredUntil !== null && featuredUntil > now;

  const imagesApiRaw = a.images;
  const imagesApi = Array.isArray(imagesApiRaw) ? imagesApiRaw : [];
  const slike: string[] = imagesApi.length
    ? imagesApi
        .map((img: any) => (img && typeof img.url === 'string' ? img.url : null))
        .filter((u): u is string => !!u)
    : Array.isArray(a.slike)
      ? (a.slike as unknown[]).filter((u): u is string => typeof u === 'string')
      : [];

  const slikeThumbs: string[] | undefined = imagesApi.length
    ? imagesApi
        .map((img: any) => {
          if (img && typeof img.thumbUrl === 'string' && img.thumbUrl) return img.thumbUrl;
          if (img && typeof img.url === 'string' && img.url) return img.url;
          return null;
        })
        .filter((u): u is string => !!u)
    : undefined;

  let slug = '';
  if (typeof a.slug === 'string' && a.slug.trim()) {
    slug = a.slug;
  } else if (typeof a.seoSlug === 'string' && a.seoSlug.trim()) {
    slug = String(a.seoSlug);
  }

  const rawId = a.id ?? a.adId ?? null;
  if (rawId == null) {
    console.error('[mapApiAdToAd] missing id for ad', a);
  }
  const id = String(rawId ?? `unknown-${now}`);

  let createdAt = now;
  if (a.createdAt) {
    const ts = new Date(a.createdAt as any).getTime();
    if (Number.isFinite(ts)) {
      createdAt = ts;
    } else {
      console.error('[mapApiAdToAd] invalid createdAt', a.createdAt);
    }
  }

  let priceNum = 0;
  if (typeof a.cijena === 'number') {
    priceNum = a.cijena;
  } else if (a.cijena != null) {
    const parsed = Number(String(a.cijena).replace(',', '.'));
    if (Number.isFinite(parsed)) {
      priceNum = parsed;
    } else {
      console.error('[mapApiAdToAd] invalid cijena', a.cijena);
    }
  }
  const cijena = Math.round(priceNum * 100) / 100;

  const kontaktImeSource = a.vlasnik?.ime ?? a.kontaktIme;
  const kontaktIme = typeof kontaktImeSource === 'string' && kontaktImeSource.trim()
    ? kontaktImeSource
    : 'Prodavac';

  const kontaktTelefonSource = a.vlasnik?.telefon ?? a.kontaktTelefon;
  const kontaktTelefon = typeof kontaktTelefonSource === 'string' ? kontaktTelefonSource : '';

  const vehicleSpecs = a.vehicleSpecs && typeof a.vehicleSpecs === 'object' && !Array.isArray(a.vehicleSpecs)
    ? (a.vehicleSpecs as Record<string, unknown>)
    : undefined;
  const vs = vehicleSpecs as Record<string, unknown> | undefined;
  const makeStr = a.make ?? vs?.marka;
  const modelStr = a.model ?? vs?.model;
  const isAutomobili = (a.potkategorija || a.kategorija || '').toLowerCase().includes('automobili') || a.kategorija === 'motorna_vozila';
  const isMotocikli = (a.potkategorija || '').toLowerCase().includes('motocikli');
  let carDetails: Record<string, unknown> | undefined;
  let motorcycleDetails: Record<string, unknown> | undefined;
  if (isAutomobili && (vs || makeStr || modelStr)) {
    carDetails = {
      marka: makeStr ?? vs?.marka ?? '',
      model: modelStr ?? vs?.model ?? '',
      godiste: vs?.godiste ?? (d as any)?.godiste,
      kilometraza: vs?.kilometraza ?? (d as any)?.kilometraza,
      gorivo: vs?.gorivo ?? (d as any)?.gorivo ?? '',
      mjenjac: vs?.mjenjac ?? (d as any)?.mjenjac ?? '',
      karoserija: vs?.karoserija ?? (d as any)?.karoserija ?? '',
      pogon: vs?.pogon ?? (d as any)?.pogon ?? '',
      snaga: vs?.snagaKS ?? vs?.snaga ?? (d as any)?.snaga,
      snagaKW: vs?.snagaKW ?? (d as any)?.snagaKW,
      kubikaza: vs?.kubikaza ?? (d as any)?.kubikaza,
      stanje: vs?.stanje ?? (d as any)?.stanje ?? 'Polovno',
      boja: vs?.boja ?? (d as any)?.boja,
      registrovanDo: vs?.registrovanDo ?? (d as any)?.registrovanDo,
    };
  }
  if (isMotocikli && (vs || makeStr || modelStr)) {
    motorcycleDetails = {
      marka: makeStr ?? vs?.marka ?? '',
      model: modelStr ?? vs?.model ?? '',
      godiste: vs?.godiste ?? (d as any)?.godiste,
      kilometraza: vs?.kilometraza ?? (d as any)?.kilometraza,
      gorivo: vs?.gorivo ?? (d as any)?.gorivo ?? '',
      mjenjac: vs?.mjenjac ?? (d as any)?.mjenjac ?? '',
      kubikaza: vs?.kubikaza ?? (d as any)?.kubikaza,
      snagaKW: vs?.snagaKW ?? vs?.snaga ?? (d as any)?.snagaKW,
      tip: vs?.tip ?? (d as any)?.tip ?? '',
      stanje: vs?.stanje ?? (d as any)?.stanje ?? 'Polovno',
    };
  }

  const vlasnikId = a.vlasnikId != null ? String(a.vlasnikId) : (a.vlasnik?.id != null ? String(a.vlasnik.id) : '');
  const status = (a.status && typeof a.status === 'string') ? a.status : 'AKTIVAN';

  return {
    ...a,
    id,
    slug,
    slike,
    slikeThumbs,
    createdAt,
    cijena,
    vlasnikId,
    status,
    potkategorija: a.potkategorija || 'Basic',
    tipOglasa: a.tipOglasa || undefined,
    realEstateDetails,
    details,
    carDetails: carDetails as any,
    motorcycleDetails: motorcycleDetails as any,
    kontaktIme,
    kontaktTelefon,
    glavnaSlikaIndex: 0,
    pogledi: typeof a.pogledi === 'number' ? a.pogledi : 0,
    isPaid: isPremium,
    promotionStatus: isPremium ? 'active' : 'none',
    promotionPlan: null,
    promotedUntil: isPremium ? featuredUntil : null,
    promotionPrice: isPremium ? 10 : null
  } as Ad;
};

