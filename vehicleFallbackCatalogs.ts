/**
 * Fallback katalozi marka/model za sve podkategorije motornih vozila.
 * Koristi se kada API (baza) nema unose za datu podkategoriju – isto kao na AutoDiler i sličnim portalima.
 * Format: Record<marka, modeli[]>.
 */

export type MakeModelCatalog = Record<string, string[]>;

/** Kamioni – uobičajene marke i modeli */
export const KAMIONI_CATALOG: MakeModelCatalog = {
  'Mercedes-Benz': ['Actros', 'Atego', 'Econic', 'Axor', 'Antos', 'Arocs', 'Unimog', 'Ostalo'],
  'MAN': ['TGX', 'TGS', 'TGM', 'TGL', 'TG', 'F2000', 'F90', 'Ostalo'],
  'Scania': ['R serija', 'S serija', 'P serija', 'G serija', 'L serija', 'Ostalo'],
  'Volvo': ['FH', 'FM', 'FE', 'FL', 'FH16', 'Ostalo'],
  'DAF': ['XF', 'CF', 'LF', 'LF Electric', 'Ostalo'],
  'Iveco': ['S-Way', 'Stralis', 'Trakker', 'Eurocargo', 'Daily', 'Ostalo'],
  'Renault Trucks': ['T', 'T High', 'C', 'K', 'D', 'D Wide', 'Ostalo'],
  'Ford': ['F-MAX', 'Cargo', 'Transit', 'Ostalo'],
  'Tatra': ['Phoenix', 'TerrNo1', 'Ostalo'],
  'FAP': ['2228', '1316', 'Ostalo'],
  'Ostalo': ['Ostalo'],
};

/** Traktori – poljoprivredna i šumska mehanizacija */
export const TRAKTORI_CATALOG: MakeModelCatalog = {
  'John Deere': ['6M', '6R', '7R', '8R', '9R', '5E', '6D', 'Ostalo'],
  'Case IH': ['Puma', 'Maxxum', 'Magnum', 'Steiger', 'Farmall', 'Ostalo'],
  'New Holland': ['T6', 'T7', 'T8', 'T9', 'T4', 'T5', 'Ostalo'],
  'Fendt': ['200 Vario', '300 Vario', '400 Vario', '500 Vario', '700 Vario', '900 Vario', 'Ostalo'],
  'Massey Ferguson': ['3S', '5S', '6S', '7S', '8S', 'Ostalo'],
  'Valtra': ['A', 'N', 'T', 'S', 'Ostalo'],
  'Claas': ['Axion', 'Arion', 'Nexos', 'Ostalo'],
  'Deutz-Fahr': ['5E', '6E', '7E', '8T', '9TTV', 'Ostalo'],
  'Kubota': ['M serija', 'B serija', 'L serija', 'Ostalo'],
  'Zetor': ['Proxima', 'Forterra', 'Crystal', 'Ostalo'],
  'Ursus': ['C-360', 'C-385', 'C-390', 'Ostalo'],
  'IMT': ['539', '533', 'Ostalo'],
  'Same': ['Lamborghini', 'Hurlimann', 'Ostalo'],
  'LS Tractor': ['MT2', 'MT3', 'MT4', 'Ostalo'],
  'Ostalo': ['Ostalo'],
};

/** Četvorotočkaši (ATV/Quad) */
export const CETVOROTOCKASI_CATALOG: MakeModelCatalog = {
  'Honda': ['TRX', 'FourTrax', 'Rancher', 'Rubicon', 'Foreman', 'Ostalo'],
  'Yamaha': ['Grizzly', 'Kodiak', 'Raptor', 'Wolverine', 'YFZ', 'Ostalo'],
  'Kawasaki': ['Brute Force', 'Prairie', 'KFX', 'Ostalo'],
  'Suzuki': ['KingQuad', 'QuadSport', 'Ostalo'],
  'Polaris': ['Sportsman', 'RZR', 'Ranger', 'General', 'Ostalo'],
  'Can-Am': ['Outlander', 'Renegade', 'Maverick', 'Defender', 'Ostalo'],
  'CFMoto': ['CForce', 'ZForce', 'UForce', 'Ostalo'],
  'KTM': ['XC', 'EXC', 'Ostalo'],
  'Arctic Cat': ['Alterra', 'DVX', 'Ostalo'],
  'Ostalo': ['Ostalo'],
};

/** Kombi vozila */
export const KOMBI_CATALOG: MakeModelCatalog = {
  'Mercedes-Benz': ['Vito', 'Viano', 'Sprinter', 'Citan', 'eVito', 'eSprinter', 'Ostalo'],
  'Volkswagen': ['Transporter', 'Caddy', 'Multivan', 'Caravelle', 'California', 'Ostalo'],
  'Ford': ['Transit', 'Transit Custom', 'Transit Connect', 'Tourneo', 'Ostalo'],
  'Renault': ['Trafic', 'Master', 'Kangoo', 'Ostalo'],
  'Fiat': ['Ducato', 'Scudo', 'Talento', 'Doblo', 'Ostalo'],
  'Peugeot': ['Partner', 'Expert', 'Boxer', 'Traveller', 'Rifter', 'Ostalo'],
  'Citroën': ['Berlingo', 'Jumpy', 'Jumper', 'Spacetourer', 'Ostalo'],
  'Opel': ['Combo', 'Vivaro', 'Movano', 'Zafira Life', 'Ostalo'],
  'Toyota': ['Proace', 'Proace City', 'Hiace', 'Ostalo'],
  'Nissan': ['NV200', 'NV300', 'Primastar', 'Interstar', 'Ostalo'],
  'Hyundai': ['H-1', 'Staria', 'H-100', 'Ostalo'],
  'Iveco': ['Daily', 'Ostalo'],
  'Ostalo': ['Ostalo'],
};

/** Autobusi */
export const AUTOBUSI_CATALOG: MakeModelCatalog = {
  'Mercedes-Benz': ['Sprinter City', 'Citaro', 'Conecto', 'Intouro', 'Tourismo', 'Ostalo'],
  'MAN': ['Lion\'s City', 'Lion\'s Coach', 'Lion\'s Intercity', 'Ostalo'],
  'Scania': ['Citywide', 'Touring', 'Interlink', 'Ostalo'],
  'Volvo': ['7900', '9900', 'B8R', 'B11R', 'Ostalo'],
  'Iveco': ['Crossway', 'Evadys', 'E-way', 'Urbanway', 'Ostalo'],
  'Setra': ['S 500', 'S 400', 'Multi Class', 'Ostalo'],
  'Neoplan': ['Cityliner', 'Tourliner', 'Skyliner', 'Ostalo'],
  'VDL': ['Citea', 'Futura', 'Ostalo'],
  'Solaris': ['Urbino', 'Interurbino', 'Ostalo'],
  'Otokar': ['Kent', 'Sultan', 'Ostalo'],
  'FAP': ['FAP 313', 'Ostalo'],
  'Ostalo': ['Ostalo'],
};

/** Prikolice / poluprikolice */
export const PRIKOLICE_CATALOG: MakeModelCatalog = {
  'Schmitz Cargobull': ['S.KO', 'S.KI', 'S.KO COOL', 'Ostalo'],
  'Krone': ['SDP', 'SP', 'SDP-K', 'Cool Liner', 'Ostalo'],
  'Kögel': ['Cargo', 'Light', 'Ostalo'],
  'Wielton': ['PS', 'PT', 'Ostalo'],
  'Lamberet': ['Frigo', 'Ostalo'],
  'Gray Adams': ['Ostalo'],
  'Tirsan': ['Ostalo'],
  'Fruehauf': ['Ostalo'],
  'Ifor Williams': ['Ostalo'],
  'Ostalo': ['Ostalo'],
};

/** Kamperi */
export const KAMPERI_CATALOG: MakeModelCatalog = {
  'Volkswagen': ['California', 'Grand California', 'Ostalo'],
  'Fiat': ['Ducato Camper', 'Ostalo'],
  'Mercedes-Benz': ['Marco Polo', 'Ostalo'],
  'Hobby': ['Premium', 'De Luxe', 'Ostalo'],
  'Knaus': ['BoxStar', 'Tabbert', 'Ostalo'],
  'Bürstner': ['Averso', 'Ixo', 'Ostalo'],
  'Hymer': ['B-MC', 'B-MD', 'Ostalo'],
  'Rapido': ['Ostalo'],
  'Pilote': ['Ostalo'],
  'Chausson': ['Ostalo'],
  'Adria': ['Action', 'Matrix', 'Ostalo'],
  'Roller Team': ['Ostalo'],
  'Ostalo': ['Ostalo'],
};

const ALL_FALLBACKS: Record<string, MakeModelCatalog> = {
  kamioni: KAMIONI_CATALOG,
  traktori: TRAKTORI_CATALOG,
  cetvorotockasi: CETVOROTOCKASI_CATALOG,
  kombi: KOMBI_CATALOG,
  autobusi: AUTOBUSI_CATALOG,
  prikolice: PRIKOLICE_CATALOG,
  kamperi: KAMPERI_CATALOG,
};

export function getFallbackMakeNames(subcategory: string): string[] {
  const catalog = ALL_FALLBACKS[subcategory];
  if (!catalog) return [];
  return Object.keys(catalog).filter((k) => k !== 'Ostalo').sort((a, b) => a.localeCompare(b)).concat('Ostalo');
}

export function getFallbackModelNames(subcategory: string, makeName: string): string[] {
  const catalog = ALL_FALLBACKS[subcategory];
  if (!catalog || !makeName) return [];
  return catalog[makeName] || ['Ostalo'];
}

/** Vraća listu stavki za dropdown (id, name, slug) za marke u datoj podkategoriji */
export function getFallbackMakeItems(subcategory: string): { id: string; name: string; slug: string }[] {
  return getFallbackMakeNames(subcategory).map((name) => ({
    id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  }));
}

/** Vraća listu stavki za dropdown za modele */
export function getFallbackModelItems(subcategory: string, makeName: string): { id: string; name: string; slug: string }[] {
  return getFallbackModelNames(subcategory, makeName).map((name) => ({
    id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
  }));
}

export function hasFallbackCatalog(subcategory: string): boolean {
  return subcategory in ALL_FALLBACKS;
}
