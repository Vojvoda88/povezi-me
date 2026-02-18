/**
 * Taxonomija i konfiguracija filtera za kategoriju "Motorna vozila".
 * Zajednički + specifični filteri po podkategoriji. Bez promjene dizajna – samo data layer.
 */

export const MOTORNA_VOZILA_CATEGORY_ID = 'motorna_vozila';
export const MOTORNA_VOZILA_SLUG = 'motorna-vozila';

export type VehicleSubcategoryId =
  | 'automobili'
  | 'motocikli'
  | 'kamioni'
  | 'traktori'
  | 'cetvorotockasi'
  | 'kombi'
  | 'autobusi'
  | 'prikolice'
  | 'kamperi';

export const MOTORNA_VOZILA_SUBCATEGORIES: { id: VehicleSubcategoryId; name: string; slug: string }[] = [
  { id: 'automobili', name: 'Automobili', slug: 'automobili' },
  { id: 'motocikli', name: 'Motocikli', slug: 'motocikli' },
  { id: 'kamioni', name: 'Kamioni', slug: 'kamioni' },
  { id: 'traktori', name: 'Traktori', slug: 'traktori' },
  { id: 'cetvorotockasi', name: 'Četvorotočkaši (ATV/Quad)', slug: 'cetvorotockasi' },
  { id: 'kombi', name: 'Kombi vozila', slug: 'kombi' },
  { id: 'autobusi', name: 'Autobusi', slug: 'autobusi' },
  { id: 'prikolice', name: 'Prikolice / Poluprikolice', slug: 'prikolice' },
  { id: 'kamperi', name: 'Kamperi', slug: 'kamperi' },
];

/** Zajednički filteri za sve podkategorije motornih vozila */
export const COMMON_VEHICLE_FILTER_KEYS = [
  'make',
  'model',
  'yearMin',
  'yearMax',
  'priceMin',
  'priceMax',
  'location',
  'fuel',
  'transmission',
  'mileageMin',
  'mileageMax',
  'stanje',
  'sort',
] as const;

/** Mapiranje specifičnih filtera po podkategoriji (ključevi u vehicleSpecs / query) – usklađeno s vehicleFilters.ts */
export const SPEC_FILTER_KEYS_BY_SUBCATEGORY: Record<VehicleSubcategoryId, readonly string[]> = {
  automobili: ['karoserija', 'pogon', 'mjenjac', 'gorivo', 'kilometrazaMin', 'kilometrazaMax', 'snagaKW', 'snagaKS', 'emisioniStandard', 'brojVrata', 'brojSjedišta'],
  motocikli: ['tip', 'kubikaza', 'snagaKW', 'kilometrazaMin', 'kilometrazaMax', 'gorivo', 'mjenjac'],
  kamioni: ['tip', 'klasaNosivosti', 'nosivostKg', 'brojOsovina', 'pogon', 'emisioniStandard', 'kilometrazaMin', 'kilometrazaMax'],
  kombi: ['namjena', 'dužina', 'visina', 'zapreminaM3', 'nosivostKg', 'brojSjedišta', 'gorivo', 'mjenjac', 'kilometrazaMin', 'kilometrazaMax'],
  autobusi: ['tip', 'brojSjedišta', 'emisioniStandard', 'gorivo', 'kilometrazaMin', 'kilometrazaMax'],
  traktori: ['radniSati', 'snagaKW', 'snagaKS', 'brojCilindara', 'pogon', 'kabina', 'gorivo'],
  cetvorotockasi: ['kubikaza', 'tip', 'pogon', 'kilometrazaMin', 'kilometrazaMax', 'gorivo'],
  prikolice: ['tip', 'nosivostKg', 'brojOsovina', 'dužina'],
  kamperi: ['tip', 'brojLežajeva', 'mjenjac', 'gorivo', 'kilometrazaMin', 'kilometrazaMax'],
};

/** Svi dozvoljeni query parametri za subkategoriju (common + spec) */
export function getAllowedFilterKeysForSubcategory(subcategory: VehicleSubcategoryId): string[] {
  const common = [...COMMON_VEHICLE_FILTER_KEYS];
  const spec = SPEC_FILTER_KEYS_BY_SUBCATEGORY[subcategory] || [];
  return [...common, ...spec];
}

/** Provjeri da li je parametar spec za datu subkategoriju – backend ignoriše/odbija ostale */
export function isSpecParamForSubcategory(param: string, subcategory: VehicleSubcategoryId): boolean {
  return (SPEC_FILTER_KEYS_BY_SUBCATEGORY[subcategory] as readonly string[]).includes(param);
}

export function getSpecFilterKeys(subcategory: VehicleSubcategoryId): readonly string[] {
  return SPEC_FILTER_KEYS_BY_SUBCATEGORY[subcategory] || [];
}
