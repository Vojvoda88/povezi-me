/**
 * Source-of-truth za filtere "Motorna vozila" po podkategoriji.
 * commonFilters + filtersBySubcategory; backend validira prema allowedSpecsKeys.
 */

import type { VehicleSubcategoryId } from './vehicleTaxonomy';

export const MOTORNA_VOZILA_CATEGORY_ID = 'motorna_vozila';

/** Zajednički filteri za sve podkategorije (query keys) */
export const COMMON_FILTER_KEYS = [
  'lokacija',
  'priceMin',
  'priceMax',
  'godisteMin',
  'godisteMax',
  'stanje',
  'sort',
  'make',
  'marka',
  'model',
  'kilometrazaMin',
  'kilometrazaMax',
] as const;

export type FilterFieldType = 'select' | 'number' | 'range' | 'boolean';
export interface FilterFieldDef {
  key: string;
  label: string;
  type: FilterFieldType;
  options?: readonly string[];
  min?: number;
  max?: number;
}

/** Specifični filteri po podkategoriji (za UI i backend allowedSpecsKeys) */
export const FILTERS_BY_SUBCATEGORY: Record<VehicleSubcategoryId, FilterFieldDef[]> = {
  automobili: [
    { key: 'karoserija', label: 'Karoserija', type: 'select', options: ['SUV', 'Limuzina', 'Karavan', 'Hatchback', 'Coupe', 'Kabrio', 'Pickup', 'Ostalo'] },
    { key: 'pogon', label: 'Pogon', type: 'select', options: ['FWD', 'RWD', '4x4'] },
    { key: 'mjenjac', label: 'Mjenjač', type: 'select', options: ['Manuelni', 'Automatski', 'Poluautomatski'] },
    { key: 'gorivo', label: 'Gorivo', type: 'select', options: ['Benzin', 'Dizel', 'Hibrid', 'Električni', 'TNG'] },
    { key: 'kilometrazaMin', label: 'Kilometraža od', type: 'number', min: 0 },
    { key: 'kilometrazaMax', label: 'Kilometraža do', type: 'number', min: 0 },
    { key: 'snagaKW', label: 'Snaga (kW)', type: 'range', min: 0, max: 1000 },
    { key: 'snagaKS', label: 'Snaga (KS)', type: 'range', min: 0, max: 1500 },
    { key: 'emisioniStandard', label: 'Euro norma', type: 'select', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6'] },
    { key: 'brojVrata', label: 'Broj vrata', type: 'select', options: ['2', '3', '4', '5'] },
    { key: 'brojSjedišta', label: 'Broj sjedišta', type: 'select', options: ['2', '4', '5', '6', '7+'] },
  ],
  motocikli: [
    { key: 'tip', label: 'Tip', type: 'select', options: ['Scooter', 'Naked', 'Sport', 'Enduro', 'Touring', 'Chopper', 'Cross', 'Ostalo'] },
    { key: 'kubikaza', label: 'Kubikaža (cm³)', type: 'range', min: 50, max: 2500 },
    { key: 'snagaKW', label: 'Snaga (kW)', type: 'range', min: 0, max: 300 },
    { key: 'kilometrazaMin', label: 'Kilometraža od', type: 'number', min: 0 },
    { key: 'kilometrazaMax', label: 'Kilometraža do', type: 'number', min: 0 },
    { key: 'gorivo', label: 'Gorivo', type: 'select', options: ['Benzin', 'Dizel', 'Električni'] },
    { key: 'mjenjac', label: 'Mjenjač', type: 'select', options: ['Manuelni', 'Automatski'] },
  ],
  kamioni: [
    { key: 'tip', label: 'Namjena / tip', type: 'select', options: ['Tegljač', 'Kiper', 'Sandučar', 'Hladnjača', 'Cisterna', 'Niskogradnja', 'Šleper', 'Posebna namjena', 'Ostalo'] },
    { key: 'klasaNosivosti', label: 'Klasa mase', type: 'select', options: ['Do 7.5 t', 'Preko 7.5 t'] },
    { key: 'nosivostKg', label: 'Nosivost (kg)', type: 'range', min: 0, max: 50000 },
    { key: 'brojOsovina', label: 'Broj osovina', type: 'select', options: ['2', '3', '4', '5+'] },
    { key: 'pogon', label: 'Konfiguracija', type: 'select', options: ['4x2', '6x2', '6x4', '8x4', 'Ostalo'] },
    { key: 'emisioniStandard', label: 'Euro norma', type: 'select', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Ostalo'] },
    { key: 'kilometrazaMin', label: 'Kilometraža od', type: 'number', min: 0 },
    { key: 'kilometrazaMax', label: 'Kilometraža do', type: 'number', min: 0 },
  ],
  kombi: [
    { key: 'namjena', label: 'Namjena', type: 'select', options: ['Putnički', 'Teretni'] },
    { key: 'dužina', label: 'Dužina', type: 'select', options: ['L1 (kratak)', 'L2 (srednji)', 'L3 (dugi)'] },
    { key: 'visina', label: 'Visina', type: 'select', options: ['H1', 'H2', 'H3'] },
    { key: 'zapreminaM3', label: 'Zapremina (m³)', type: 'number', min: 0, max: 30 },
    { key: 'nosivostKg', label: 'Nosivost (kg)', type: 'number', min: 0, max: 5000 },
    { key: 'brojSjedišta', label: 'Broj sjedišta', type: 'select', options: ['2', '3', '4', '5', '6', '7', '8', '9+'] },
    { key: 'gorivo', label: 'Gorivo', type: 'select', options: ['Benzin', 'Dizel', 'Hibrid', 'Električni', 'TNG'] },
    { key: 'mjenjac', label: 'Mjenjač', type: 'select', options: ['Manuelni', 'Automatski'] },
    { key: 'kilometrazaMin', label: 'Kilometraža od', type: 'number', min: 0 },
    { key: 'kilometrazaMax', label: 'Kilometraža do', type: 'number', min: 0 },
  ],
  autobusi: [
    { key: 'tip', label: 'Tip', type: 'select', options: ['Gradski', 'Prigradski', 'Turistički / Coach', 'Mini bus', 'Ostalo'] },
    { key: 'brojSjedišta', label: 'Broj sjedišta', type: 'select', options: ['Do 20', '21-35', '36-50', '51+'] },
    { key: 'emisioniStandard', label: 'Euro norma', type: 'select', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6'] },
    { key: 'gorivo', label: 'Gorivo', type: 'select', options: ['Benzin', 'Dizel', 'Hibrid', 'Električni', 'TNG'] },
    { key: 'kilometrazaMin', label: 'Kilometraža od', type: 'number', min: 0 },
    { key: 'kilometrazaMax', label: 'Kilometraža do', type: 'number', min: 0 },
  ],
  traktori: [
    { key: 'radniSati', label: 'Radni sati', type: 'range', min: 0, max: 50000 },
    { key: 'snagaKW', label: 'Snaga (kW)', type: 'range', min: 0, max: 500 },
    { key: 'snagaKS', label: 'Snaga (KS)', type: 'range', min: 0, max: 700 },
    { key: 'brojCilindara', label: 'Broj cilindara', type: 'select', options: ['2', '3', '4', '6', 'Ostalo'] },
    { key: 'pogon', label: 'Pogon', type: 'select', options: ['4x2', '4x4'] },
    { key: 'kabina', label: 'Kabina', type: 'select', options: ['Sa kabinom', 'Bez kabine'] },
    { key: 'gorivo', label: 'Gorivo', type: 'select', options: ['Dizel', 'Benzin', 'Ostalo'] },
  ],
  cetvorotockasi: [
    { key: 'kubikaza', label: 'Kubikaža (cm³)', type: 'range', min: 50, max: 1200 },
    { key: 'tip', label: 'Tip', type: 'select', options: ['ATV', 'Quad', 'UTV', 'Side-by-side', 'Ostalo'] },
    { key: 'pogon', label: 'Pogon', type: 'select', options: ['2x4', '4x4'] },
    { key: 'kilometrazaMin', label: 'Kilometraža od', type: 'number', min: 0 },
    { key: 'kilometrazaMax', label: 'Kilometraža do', type: 'number', min: 0 },
    { key: 'gorivo', label: 'Gorivo', type: 'select', options: ['Benzin', 'Dizel', 'Električni', 'Ostalo'] },
  ],
  prikolice: [
    { key: 'tip', label: 'Tip', type: 'select', options: ['Prikolica', 'Poluprikolica', 'Kiper', 'Hladnjača', 'Cisterna', 'Platforma', 'Šleper', 'Niskogradnja', 'Ostalo'] },
    { key: 'nosivostKg', label: 'Nosivost (kg)', type: 'number', min: 0, max: 50000 },
    { key: 'brojOsovina', label: 'Broj osovina', type: 'select', options: ['1', '2', '3', '4+'] },
    { key: 'dužina', label: 'Dužina (m)', type: 'number', min: 0, max: 20 },
  ],
  kamperi: [
    { key: 'tip', label: 'Tip', type: 'select', options: ['Van conversion', 'Alkoven', 'Poluintegralni', 'Integralni', 'Ostalo'] },
    { key: 'brojLežajeva', label: 'Broj ležajeva', type: 'select', options: ['2', '3', '4', '5', '6+'] },
    { key: 'mjenjac', label: 'Mjenjač', type: 'select', options: ['Manuelni', 'Automatski'] },
    { key: 'gorivo', label: 'Gorivo', type: 'select', options: ['Benzin', 'Dizel', 'TNG', 'Ostalo'] },
    { key: 'kilometrazaMin', label: 'Kilometraža od', type: 'number', min: 0 },
    { key: 'kilometrazaMax', label: 'Kilometraža do', type: 'number', min: 0 },
  ],
};

/** Ključevi spec filtera po subkategoriji (za backend validaciju) */
export function getAllowedSpecKeys(subcategory: VehicleSubcategoryId): string[] {
  return FILTERS_BY_SUBCATEGORY[subcategory].map((f) => f.key);
}

export function isAllowedSpecKey(key: string, subcategory: VehicleSubcategoryId): boolean {
  return FILTERS_BY_SUBCATEGORY[subcategory].some((f) => f.key === key);
}
