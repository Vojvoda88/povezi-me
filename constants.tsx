import { AdStatus, FuelType, Ad, TransmissionType, DriveType, BodyType, MotorcycleType, Notification } from './types';

// Glavna kategorija "Motorna vozila" s podkategorijama (Automobili, Motocikli, Kamioni, Traktori, Četvorotočkaši, itd.)
export const MOTORNA_VOZILA_ID = 'motorna_vozila';
export const MOTORNA_VOZILA_SLUG = 'motorna-vozila';

// Jedina istina: Motorna vozila je JEDNA glavna kategorija; Automobili/Motocikli/Kamioni itd. su PODKATEGORIJE (selector unutar Motorna vozila).
// Nema top-level "Automobili" ni "Motocikli" – samo "Motorna vozila".
export const CATEGORIES = [
  { id: MOTORNA_VOZILA_ID, name: 'Motorna vozila', icon: '🚗', slug: MOTORNA_VOZILA_SLUG },
  { id: 'auto_dijelovi', name: 'Auto dijelovi', icon: '🔧', slug: 'auto-dijelovi' },
  { id: 'nekretnine', name: 'Nekretnine', icon: '🏠', slug: 'nekretnine' },
  { id: 'usluge', name: 'Usluge', icon: '🛠️', slug: 'usluge' },
  { id: 'bijela_tehnika', name: 'Bijela tehnika', icon: '🧊', slug: 'bijela-tehnika' },
  { id: 'namjestaj', name: 'Namještaj', icon: '🛋️', slug: 'namjestaj' },
  { id: 'poljoprivreda', name: 'Poljoprivreda', icon: '🚜', slug: 'poljoprivreda' },
  { id: 'tehnika', name: 'Tehnika', icon: '💻', slug: 'tehnika' },
  { id: 'kucni_ljubimci', name: 'Kućni ljubimci', icon: '🐾', slug: 'kucni-ljubimci' },
  { id: 'moda', name: 'Moda', icon: '👕', slug: 'moda' },
  { id: 'poslovi', name: 'Poslovi', icon: '💼', slug: 'poslovi' },
  { id: 'sport', name: 'Sport i rekreacija', icon: '⚽', slug: 'sport-i-rekreacija' },
  { id: 'gradjevina', name: 'Građevina i alati', icon: '🏗️', slug: 'gradjevina-i-alati' },
  { id: 'pokloni_cvijece', name: 'Pokloni i cvijeće', icon: '🎁', slug: 'pokloni-i-cvijece' },
  { id: 'ostalo', name: 'Ostalo', icon: '📦', slug: 'ostalo' },
];

/** Podkategorije za "Motorna vozila" (selector u filteru – jedini izvor za vehicle subcategory). */
export const MOTORNA_VOZILA_SUBCATEGORIES = [
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

/** ID-evi PODKATEGORIJA unutar Motorna vozila (za FilterPanel config i validaciju). */
export const VEHICLE_SUBCATEGORY_IDS = MOTORNA_VOZILA_SUBCATEGORIES.map((s) => s.id);

/** Gorivo za motocikle – bez plina (TNG) i hibrida, jer motori praktično ne koriste te opcije. */
export const MOTORCYCLE_FUEL_OPTIONS: FuelType[] = [FuelType.BENZIN, FuelType.DIZEL, FuelType.ELEKTRICNI];

export const TIP_OGLASA_OPTIONS = [
  { id: 'prodajem', name: 'Prodajem' },
  { id: 'trazim', name: 'Tražim' },
];
export const TIP_OGLASA_USLUGE = [
  { id: 'nudim', name: 'Nudim uslugu' },
  { id: 'trazim', name: 'Tražim uslugu' },
];
export const NEKRETNINE_TIP_PONUDE = [
  { id: 'prodaja', name: 'Prodaja' },
  { id: 'izdavanje', name: 'Izdavanje' },
];
/** Tip nekretnine – prvo se bira; od toga zavise polja (npr. plac nema spratnost). */
export const NEKRETNINE_TIP = [
  { id: 'stan', name: 'Stan' },
  { id: 'kuca', name: 'Kuća' },
  { id: 'plac', name: 'Plac' },
  { id: 'poslovni_prostor', name: 'Poslovni prostor' },
  { id: 'garaza', name: 'Garaža' },
  { id: 'vikendica', name: 'Vikendica' },
  { id: 'ostalo', name: 'Ostalo' },
];
export const NEKRETNINE_BROJ_SOBA = ['1', '2', '3', '4', '4+'];
/** Spratnost – prikazuje se samo za stan, kuću, vikendicu, poslovni prostor (ne za plac, garažu). */
export const NEKRETNINE_SPRAT = [
  { id: 'suteren', name: 'Suteren' },
  { id: 'prizemlje', name: 'Prizemlje' },
  { id: '1', name: '1' },
  { id: '2', name: '2' },
  { id: '3', name: '3' },
  { id: '4', name: '4' },
  { id: '5+', name: '5+' },
];
/** Koja polja prikazati po tipu nekretnine (filter i forma). */
export const NEKRETNINE_TIP_FIELDS: Record<string, { brojSoba: boolean; sprat: boolean }> = {
  stan: { brojSoba: true, sprat: true },
  kuca: { brojSoba: true, sprat: true },
  plac: { brojSoba: false, sprat: false },
  poslovni_prostor: { brojSoba: false, sprat: true },
  garaza: { brojSoba: false, sprat: false },
  vikendica: { brojSoba: true, sprat: true },
  ostalo: { brojSoba: false, sprat: false },
};

/** Amenities za nekretnine – filter i prikaz. */
export const NEKRETNINE_AMENITIES = [
  { id: 'klima', name: 'Klima' },
  { id: 'bazen', name: 'Bazen' },
  { id: 'parking', name: 'Parking' },
  { id: 'garaza', name: 'Garaža' },
  { id: 'terasa', name: 'Terasa' },
  { id: 'balkon', name: 'Balkon' },
  { id: 'vrt', name: 'Vrt' },
  { id: 'lift', name: 'Lift' },
  { id: 'centralno_grijanje', name: 'Centralno grijanje' },
  { id: 'pet_friendly', name: 'Pet-friendly' },
  { id: 'wifi', name: 'WiFi' },
];

export const LOCATIONS = [
  'Podgorica', 'Budva', 'Kotor', 'Tivat', 'Nikšić', 'Bar', 'Herceg Novi', 'Bijelo Polje', 'Cetinje', 'Ulcinj', 'Pljevlja'
];

/** Koordinate centra grada [lat, lng] za prikaz na mapi (OpenStreetMap). */
export const LOCATION_COORDS: Record<string, [number, number]> = {
  'Podgorica': [42.4304, 19.2594],
  'Budva': [42.2780, 18.8417],
  'Kotor': [42.4247, 18.7712],
  'Tivat': [42.4236, 18.6969],
  'Nikšić': [42.7731, 18.9445],
  'Bar': [42.0914, 19.0899],
  'Herceg Novi': [42.4531, 18.5314],
  'Bijelo Polje': [43.0383, 19.7476],
  'Cetinje': [42.3908, 18.9142],
  'Ulcinj': [41.9236, 19.2056],
  'Pljevlja': [43.3569, 19.3583],
};

export const STANJE_OPTIONS = ['Polovno', 'Novo', 'Oštećeno'];

export const MOTO_CATALOG: Record<string, string[]> = {
  "Honda": ["Africa Twin", "CB 500F", "CBR 600RR", "X-ADV", "Hornet", "PCX 125"],
  "Yamaha": ["MT-07", "MT-09", "TMAX 560", "R1", "Tracer 9", "XMAX 300"],
  "Kawasaki": ["Ninja 650", "Z900", "Versys 650", "Ninja H2", "Vulcan S"],
  "Suzuki": ["GSX-R 1000", "V-Strom 650", "Hayabusa", "Burgman 400", "SV650"],
  "BMW": ["R 1250 GS", "S 1000 RR", "F 850 GS", "C 400 GT", "G 310 R"],
  "KTM": ["Duke 390", "Adventure 1290", "Super Duke 1290 R", "Exc 300"],
  "Ducati": ["Panigale V4", "Multistrada V4", "Monster", "Diavel", "Scrambler"],
  "Piaggio": ["Beverly 300", "Liberty 125", "Medley 150"],
  "Vespa": ["GTS 300", "Primavera 125", "Sprint 50"],
  "Harley-Davidson": ["Iron 883", "Fat Boy", "Street Glide", "Pan America"],
  "Aprilia": ["RS 660", "Tuono V4", "SR GT 200"],
  "Ostalo": ["Ostalo"]
};

export const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', korisnikId: 'user-0', tip: 'payment', naslov: 'Uspešna uplata', poruka: 'Vaš oglas je sada istaknut.', link: '/moji-oglasi', procitano: false, createdAt: Date.now() - 3600000 }
];

// Unified schema for rendering forms and filter panels
export const VEHICLE_FIELDS_CONFIG = {
  automobili: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1950, max: 2025 },
    kilometraza: { type: 'number', label: 'Kilometraža (km)' },
    gorivo: { type: 'select', label: 'Gorivo', options: Object.values(FuelType) },
    mjenjac: { type: 'select', label: 'Mjenjač', options: Object.values(TransmissionType) },
    karoserija: { type: 'select', label: 'Karoserija', options: Object.values(BodyType) },
    pogon: { type: 'select', label: 'Pogon', options: Object.values(DriveType) },
    emisioniStandard: { type: 'select', label: 'Euro norma', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Ostalo'] },
    kubikaza: { type: 'number', label: 'Kubikaža (cm3)' },
    snaga: { type: 'number', label: 'Snaga (KS)' },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  motocikli: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1950, max: 2025 },
    kilometraza: { type: 'number', label: 'Kilometraža (km)' },
    gorivo: { type: 'select', label: 'Gorivo', options: MOTORCYCLE_FUEL_OPTIONS },
    mjenjac: { type: 'select', label: 'Mjenjač', options: Object.values(TransmissionType) },
    kubikaza: { type: 'number', label: 'Kubikaža (cm3)' },
    snagaKW: { type: 'number', label: 'Snaga (kW)' },
    tip: { type: 'select', label: 'Tip', options: Object.values(MotorcycleType) },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  nekretnine: {
    tip_nekretnine: { type: 'select', label: 'Tip nekretnine' },
    tip_ponude: { type: 'select', label: 'Tip ponude', options: ['Prodaja', 'Izdavanje'] },
    kvadratura: { type: 'number', label: 'Kvadratura (m²)', min: 0, max: 2000 },
    broj_soba: { type: 'select', label: 'Broj soba', options: ['1', '2', '3', '4', '4+'] },
    sprat: { type: 'select', label: 'Spratnost' },
  },
  auto_dijelovi: {
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  kamioni: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1990, max: 2025 },
    kilometraza: { type: 'number', label: 'Kilometraža (km)' },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
    tip: { type: 'select', label: 'Namjena / tip', options: ['Tegljač', 'Kiper', 'Sandučar', 'Hladnjača', 'Cisterna', 'Niskogradnja', 'Posebna namjena', 'Ostalo'] },
    klasaNosivosti: { type: 'select', label: 'Klasa mase', options: ['Do 7.5 t', 'Preko 7.5 t'] },
    nosivostKg: { type: 'number', label: 'Nosivost (kg)' },
    brojOsovina: { type: 'select', label: 'Broj osovina', options: ['2', '3', '4', '5+'] },
    pogon: { type: 'select', label: 'Konfiguracija', options: ['4x2', '6x2', '6x4', '8x4', 'Ostalo'] },
    emisioniStandard: { type: 'select', label: 'Euro norma', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Ostalo'] },
  },
  traktori: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1980, max: 2025 },
    radniSati: { type: 'number', label: 'Radni sati' },
    snagaKW: { type: 'number', label: 'Snaga (kW)' },
    brojCilindara: { type: 'select', label: 'Broj cilindara', options: ['2', '3', '4', '6', 'Ostalo'] },
    kabina: { type: 'select', label: 'Kabina', options: ['Sa kabinom', 'Bez kabine'] },
    pogon: { type: 'select', label: 'Pogon', options: ['4x2', '4x4'] },
    gorivo: { type: 'select', label: 'Gorivo', options: [FuelType.DIZEL, FuelType.BENZIN, 'Ostalo'] },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  cetvorotockasi: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1990, max: 2025 },
    kilometraza: { type: 'number', label: 'Kilometraža (km)' },
    kubikaza: { type: 'number', label: 'Kubikaža (cm3)' },
    tip: { type: 'select', label: 'Tip', options: ['ATV', 'Quad', 'Side-by-side', 'Ostalo'] },
    gorivo: { type: 'select', label: 'Gorivo', options: [FuelType.BENZIN, FuelType.DIZEL, FuelType.ELEKTRICNI, 'Ostalo'] },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  kombi: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1990, max: 2025 },
    kilometraza: { type: 'number', label: 'Kilometraža (km)' },
    tip: { type: 'select', label: 'Tip', options: ['Putnički', 'Teretni', 'Ostalo'] },
    velicina: { type: 'select', label: 'Veličina', options: ['L', 'M', 'H', 'Ostalo'] },
    nosivostKg: { type: 'number', label: 'Nosivost (kg)' },
    brojSjedista: { type: 'number', label: 'Broj sjedišta' },
    gorivo: { type: 'select', label: 'Gorivo', options: Object.values(FuelType) },
    mjenjac: { type: 'select', label: 'Mjenjač', options: Object.values(TransmissionType) },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  autobusi: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1990, max: 2025 },
    kilometraza: { type: 'number', label: 'Kilometraža (km)' },
    tip: { type: 'select', label: 'Tip', options: ['Gradski', 'Turistički', 'Mini', 'Ostalo'] },
    brojSjedista: { type: 'number', label: 'Broj sjedišta' },
    gorivo: { type: 'select', label: 'Gorivo', options: Object.values(FuelType) },
    emisioniStandard: { type: 'select', label: 'Euro norma', options: ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6', 'Ostalo'] },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  prikolice: {
    marka: { type: 'select', label: 'Marka', source: 'api', optional: true },
    model: { type: 'select', label: 'Model', source: 'api', optional: true },
    tip: { type: 'select', label: 'Tip', options: ['Prikolica', 'Poluprikolica', 'Šleper', 'Niskogradnja', 'Ostalo'] },
    nosivostKg: { type: 'number', label: 'Nosivost (kg)' },
    brojOsovina: { type: 'select', label: 'Broj osovina', options: ['1', '2', '3', '4', '5+'] },
    godiste: { type: 'number', label: 'Godište', min: 1980, max: 2025 },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
  kamperi: {
    marka: { type: 'select', label: 'Marka', source: 'api' },
    model: { type: 'select', label: 'Model', source: 'api' },
    godiste: { type: 'number', label: 'Godište', min: 1990, max: 2025 },
    kilometraza: { type: 'number', label: 'Kilometraža (km)' },
    tip: { type: 'select', label: 'Tip', options: ['Priključni', 'Integrisani', 'Kombi', 'Ostalo'] },
    brojLezajeva: { type: 'number', label: 'Broj ležajeva' },
    gorivo: { type: 'select', label: 'Gorivo', options: Object.values(FuelType) },
    mjenjac: { type: 'select', label: 'Mjenjač', options: Object.values(TransmissionType) },
    stanje: { type: 'select', label: 'Stanje', options: STANJE_OPTIONS },
  },
};

const generatePremiumAds = (): Ad[] => {
  const ads: Ad[] = [];
  const now = Date.now();

  const baseItems = [
    { title: 'Audi A4 2.0 TDI S-line', cat: 'automobili', price: 16800, loc: 'Podgorica', img: 'audi,a4,car' },
    { title: 'BMW 320d M-Sport 2018', cat: 'automobili', price: 19900, loc: 'Budva', img: 'bmw,3,car' },
    { title: 'Mercedes C220d Avantgarde', cat: 'automobili', price: 17800, loc: 'Tivat', img: 'mercedes,c,car' },
    { title: 'VW Golf 7 GTE 2017', cat: 'automobili', price: 15500, loc: 'Nikšić', img: 'golf,vw,car' },
    { title: 'Audi Q5 Quattro 2019', cat: 'automobili', price: 32000, loc: 'Kotor', img: 'audi,q5,car' },
    { title: 'BMW 520d G30 2020', cat: 'automobili', price: 34500, loc: 'Podgorica', img: 'bmw,5,car' },
    { title: 'Mercedes E220d AMG 2021', cat: 'automobili', price: 48000, loc: 'Bar', img: 'mercedes,e,car' },
    { title: 'VW Polo 1.2 TSI 2016', cat: 'automobili', price: 9200, loc: 'Bijelo Polje', img: 'polo,vw,car' },
    { title: 'Audi A3 Sportback 2015', cat: 'automobili', price: 11800, loc: 'Budva', img: 'audi,a3,car' },
    { title: 'Toyota RAV4 Hybrid 2021', cat: 'automobili', price: 36500, loc: 'Podgorica', img: 'toyota,rav4,car' },
    { title: 'BMW X1 sDrive 2018', cat: 'automobili', price: 21500, loc: 'Herceg Novi', img: 'bmw,x1,car' },
    { title: 'Mercedes GLE Coupe 2022', cat: 'automobili', price: 79000, loc: 'Tivat', img: 'mercedes,gle,car' },
    { title: 'VW Tiguan R-Line 2019', cat: 'automobili', price: 28500, loc: 'Cetinje', img: 'tiguan,vw,car' },
    { title: 'Audi A6 Matrix LED 2018', cat: 'automobili', price: 27500, loc: 'Podgorica', img: 'audi,a6,car' },
    { title: 'Renault Clio 1.5 dCi 2017', cat: 'automobili', price: 8900, loc: 'Nikšić', img: 'renault,clio,car' },
    { title: 'Yamaha MT-07 ABS 2021', cat: 'motocikli', price: 6800, loc: 'Podgorica', img: 'motorcycle,yamaha' },
    { title: 'Honda Africa Twin 1100', cat: 'motocikli', price: 12500, loc: 'Budva', img: 'motorcycle,honda' },
    { title: 'BMW R 1250 GS Adventure', cat: 'motocikli', price: 18900, loc: 'Tivat', img: 'motorcycle,bmw' },
    { title: 'Dvosoban stan Centar', cat: 'nekretnine', price: 165000, loc: 'Podgorica', img: 'apartment,living' },
    { title: 'iPhone 15 Pro Max 256GB', cat: 'tehnika', price: 1180, loc: 'Podgorica', img: 'iphone,smartphone' },
  ];

  // Popuni do 50 oglasa
  for (let i = 0; i < 50; i++) {
    const base = baseItems[i % baseItems.length];
    const isPromoted = i < 13;
    const slikaNiz: string[] = [];
    for(let j=0; j<7; j++) {
      slikaNiz.push(`https://loremflickr.com/800/600/${base.img.split(',')[0]}?lock=${i * 10 + j}`);
    }

    let carDetails;
    if (base.cat === 'automobili') {
      carDetails = {
        marka: base.title.split(' ')[0],
        model: base.title.split(' ')[1],
        godiste: 2015 + Math.floor(Math.random() * 8),
        kilometraza: 80000 + Math.floor(Math.random() * 150000),
        gorivo: FuelType.DIZEL,
        mjenjac: TransmissionType.AUTOMATSKI,
        snaga: 150,
        kubikaza: 1968,
        karoserija: BodyType.LIMUZINA,
        pogon: DriveType.PREDNJI,
        stanje: 'Polovno'
      };
    }

    const realEstateDetails = base.cat === 'nekretnine' ? {
      tipNekretnine: 'stan',
      tipPonude: 'prodaja' as const,
      kvadratura: 65,
      brojSoba: '2',
      sprat: '2'
    } : undefined;

    ads.push({
      id: `ad-${i}`,
      naslov: `${base.title}${i > baseItems.length ? ' #' + i : ''}`,
      slug: `${base.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`,
      opis: `Prodaje se ${base.title} u vrhunskom stanju. Redovno održavan u ovlašćenom servisu, bez ikakvih ulaganja.`,
      kategorija: base.cat,
      potkategorija: isPromoted ? 'Premium' : 'Basic',
      cijena: base.price,
      lokacija: base.loc,
      slike: slikaNiz,
      vlasnikId: 'user-0',
      isPaid: isPromoted,
      promotionStatus: isPromoted ? 'active' : 'none',
      promotionPlan: isPromoted ? '7d' : null,
      promotedUntil: isPromoted ? now + 86400000 * 7 : null,
      promotionPrice: isPromoted ? 3.00 : null,
      createdAt: now - (i * 3600000),
      status: AdStatus.AKTIVAN,
      pogledi: Math.floor(Math.random() * 2500),
      kontaktIme: "Marko Marković",
      kontaktTelefon: "+38267000000",
      glavnaSlikaIndex: 0,
      carDetails: carDetails,
      realEstateDetails,
      motorcycleDetails: base.cat === 'motocikli' ? {
        marka: base.title.split(' ')[0],
        model: base.title.split(' ').slice(1).join(' '),
        godiste: 2021,
        kilometraza: 12000,
        kubikaza: 700,
        gorivo: FuelType.BENZIN,
        mjenjac: TransmissionType.MANUELNI,
        tip: MotorcycleType.SPORT,
        stanje: 'Polovno',
        snagaKW: 55
      } : undefined
    });
  }

  return ads;
};

export const DEMO_ADS = generatePremiumAds();