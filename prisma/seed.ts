/**
 * Seed: briše sve oglase i kreira 50 novih (miješano Ponuda/Potražnja, 15 istaknutih).
 * Koristi prvog korisnika iz baze; ako nema nijednog, kreira seed korisnika.
 *
 * Pokretanje: npx prisma db seed
 * (Zaustavite backend prije pokretanja.)
 */

import { PrismaClient, AdStatus, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CATEGORY_IDS = [
  'motorna_vozila', 'auto_dijelovi', 'nekretnine', 'tehnika', 'bijela_tehnika',
  'namjestaj', 'poljoprivreda', 'usluge', 'kucni_ljubimci',
  'moda', 'poslovi', 'sport', 'gradjevina', 'pokloni_cvijece', 'za_djecu', 'ostalo'
];

const MOTORNA_VOZILA_POTKATEGORIJE = ['automobili', 'motocikli', 'kamioni', 'traktori', 'cetvorotockasi'] as const;

const LOCATIONS = ['Podgorica', 'Budva', 'Kotor', 'Tivat', 'Nikšić', 'Bar', 'Herceg Novi'];

const SAMPLE_TITLES: Record<string, string[]> = {
  automobili: ['Audi A4 2.0 TDI', 'BMW 320d M-Sport', 'VW Golf 7', 'Mercedes C220d', 'Škoda Octavia'],
  motocikli: ['Honda CB 500F', 'Yamaha MT-07', 'Kawasaki Ninja 650', 'BMW R 1250 GS', 'Ducati Monster'],
  kamioni: ['Scania R 450', 'Volvo FH 460', 'MAN TGX 18.440', 'DAF XF 480', 'Mercedes Actros'],
  traktori: ['John Deere 6120M', 'New Holland T6.180', 'Massey Ferguson 6714', 'Case IH Puma', 'Zetor Forterra'],
  cetvorotockasi: ['Polaris Sportsman 850', 'Can-Am Outlander', 'Yamaha Grizzly 700', 'Honda FourTrax', 'CFMOTO CForce'],
  nekretnine: ['Stan 2+1 centar', 'Kuća sa vrtom', 'Stan na moru', 'Poslovni prostor', 'Garaža'],
  tehnika: ['iPhone 14 Pro', 'MacBook Air M2', 'Sony TV 55"', 'PlayStation 5', 'Samsung tablet'],
  bijela_tehnika: ['Frižider Samsung', 'Veš mašina Beko', 'Šporet plinski', 'Mašina za suđe', 'Klima uređaj'],
  namjestaj: ['Sofa 3 sjedenja', 'Krevet bračni', 'Stol i stolice', 'Orman za dnevnu', 'Radni stol'],
  poljoprivreda: ['Traktor maloprodaja', 'Kosačica', 'Kompost', 'Sjemenski krompir', 'Voćke'],
  usluge: ['Farbanje stanova', 'Prijevoz robe', 'Čišćenje', 'Instalaterske usluge', 'IT podrška'],
  kucni_ljubimci: ['Štence labradora', 'Mačići', 'Akvarijum i ribice', 'Hrana za pse', 'Kućica za psa'],
  moda: ['Jakna zimska', 'Patike Nike', 'Torba kožna', 'Sat muški', 'Naočale'],
  poslovi: ['Konobar traži posao', 'Vozač C kategorije', 'Programer React', 'Prodavačica', 'Šef kuhinje'],
  sport: ['Bicikl trek', 'Štapovi za skijanje', 'Lopta košarka', 'Reket tenis', 'Roleri'],
  gradjevina: ['Cigla 500 kom', 'Cement', 'Pijesak', 'Alatnica set', 'Bormašina'],
  pokloni_cvijece: ['Buket ruža', 'Poklon košara', 'Saksija orhideja', 'Čokolada i cvijeće', 'Balon aranžman'],
  za_djecu: ['Kombinezoni za bebe', 'Bicikl dječiji', 'Kolica za bebe', 'Igračke LEGO', 'Školski ranac'],
  ostalo: ['Stvari za poklon', 'Kolekcionarski predmet', 'Antikvitet', 'Razno'],
  auto_dijelovi: ['Gume zimske', 'Akumulator', 'Sjenila', 'Felge aluminijumske', 'Retrovizor']
};

function slugify(title: string, i: number): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'oglas';
  return `${base}-seed-${i}`;
}

/** Placeholder slike po kategoriji (picsum.photos – seed daje konzistentne slike). */
function imageUrlsForAd(adIndex: number, kategorija: string): { url: string; order: number }[] {
  const seeds = [adIndex, adIndex + 100, adIndex + 200];
  return seeds.slice(0, 1 + (adIndex % 3)).map((seed, order) => ({
    url: `https://picsum.photos/seed/${seed}/800/600`,
    order
  }));
}

async function main() {
  let userId: string;

  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    userId = firstUser.id;
    console.log('Korišten postojeći korisnik:', firstUser.email);
  } else {
    const passwordHash = await bcrypt.hash('Seed123!', 10);
    const user = await prisma.user.create({
      data: {
        ime: 'Seed Korisnik',
        email: 'seed@povezi.me',
        passwordHash,
        telefon: '+38269000000',
        role: Role.USER
      }
    });
    userId = user.id;
    console.log('Kreiran seed korisnik: seed@povezi.me (lozinka: Seed123!)');
  }

  const adCountBefore = await prisma.ad.count();
  await prisma.ad.deleteMany({});
  console.log('Obrisano oglasa:', adCountBefore);

  const now = new Date();
  const featuredUntil = new Date(now);
  featuredUntil.setDate(featuredUntil.getDate() + 7);

  const adsToCreate = 50;
  const featuredCount = 15;
  const trazimCount = 16;

  for (let i = 1; i <= adsToCreate; i++) {
    const kategorija = CATEGORY_IDS[i % CATEGORY_IDS.length];
    const potkategorija = kategorija === 'motorna_vozila'
      ? MOTORNA_VOZILA_POTKATEGORIJE[i % MOTORNA_VOZILA_POTKATEGORIJE.length]
      : undefined;
    const titleCategory = potkategorija ?? kategorija;
    const tipOglasa = i <= trazimCount ? 'trazim' : 'prodajem';
    const titles = SAMPLE_TITLES[titleCategory] || SAMPLE_TITLES.ostalo;
    const naslov = titles[i % titles.length] + (i > 5 ? ` #${i}` : '');
    const slug = slugify(naslov, i);
    const isFeatured = i <= featuredCount;

    await prisma.ad.create({
      data: {
        naslov,
        slug,
        opis: `Opis oglasa za ${naslov}. Stanje odlično, pregled moguć. Kontakt putem poruke ili telefona.`,
        kategorija,
        ...(potkategorija && { potkategorija }),
        cijena: 50 + (i * 37) % 5000,
        lokacija: LOCATIONS[i % LOCATIONS.length],
        status: AdStatus.AKTIVAN,
        vlasnikId: userId,
        tipOglasa,
        featuredUntil: isFeatured ? featuredUntil : undefined,
        images: {
          create: imageUrlsForAd(i, kategorija)
        }
      }
    });
  }

  console.log(`Kreirano ${adsToCreate} oglasa (${trazimCount} Tražim, ${adsToCreate - trazimCount} Prodajem), ${featuredCount} istaknutih.`);

  // Uvezi sve marke i modele iz kataloga – automobili puni katalog, ostalo postojeći podaci
  const TOP_MAKES_AUTOMOBILI = ['Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Skoda', 'Toyota', 'Renault', 'Ford', 'Peugeot', 'Opel'];
  let automobiliEntries: { vehicleType: string; name: string; slug: string; models: string[]; isPrimary: boolean; order: number }[] = [];
  try {
    const { AUTOMOTIVE_CATALOG } = await import('../automotiveCatalog');
    automobiliEntries = AUTOMOTIVE_CATALOG.map((b: { brand: string; slug: string; models: { name: string }[] }) => ({
      vehicleType: 'automobili',
      name: b.brand,
      slug: b.slug,
      models: b.models.map((m: { name: string }) => m.name),
      isPrimary: TOP_MAKES_AUTOMOBILI.includes(b.brand),
      order: TOP_MAKES_AUTOMOBILI.includes(b.brand) ? TOP_MAKES_AUTOMOBILI.indexOf(b.brand) + 1 : 500 + b.brand.localeCompare('Ostalo'),
    }));
    console.log(`Uvezeno automobili: ${automobiliEntries.length} marki (top 10: VW, BMW, Mercedes, Audi, Škoda, Toyota, Renault, Ford, Peugeot, Opel).`);
  } catch (e) {
    console.warn('Import automotiveCatalog nije uspio, koriste se samo ostale kategorije.', e);
  }

  const makesModelsRest: { vehicleType: string; name: string; slug: string; models: string[]; isPrimary?: boolean; order?: number }[] = [
    // MOTOCIKLI – top 10
    { vehicleType: 'motocikli', name: 'Honda', slug: 'honda', models: ['Africa Twin', 'CB 500F', 'CBR 600RR', 'X-ADV', 'Hornet', 'PCX 125'], isPrimary: true, order: 1 },
    { vehicleType: 'motocikli', name: 'Yamaha', slug: 'yamaha', models: ['MT-07', 'MT-09', 'TMAX 560', 'R1', 'Tracer 9', 'XMAX 300'], isPrimary: true, order: 2 },
    { vehicleType: 'motocikli', name: 'Kawasaki', slug: 'kawasaki', models: ['Ninja 650', 'Z900', 'Versys 650', 'Ninja H2', 'Vulcan S'], isPrimary: true, order: 3 },
    { vehicleType: 'motocikli', name: 'Suzuki', slug: 'suzuki', models: ['GSX-R 1000', 'V-Strom 650', 'Hayabusa', 'Burgman 400', 'SV650'], isPrimary: true, order: 4 },
    { vehicleType: 'motocikli', name: 'BMW', slug: 'bmw', models: ['R 1250 GS', 'S 1000 RR', 'F 850 GS', 'C 400 GT', 'G 310 R'], isPrimary: true, order: 5 },
    { vehicleType: 'motocikli', name: 'KTM', slug: 'ktm', models: ['Duke 390', 'Adventure 1290', 'Super Duke 1290 R', 'Exc 300'], isPrimary: true, order: 6 },
    { vehicleType: 'motocikli', name: 'Ducati', slug: 'ducati', models: ['Panigale V4', 'Multistrada V4', 'Monster', 'Diavel', 'Scrambler'], isPrimary: true, order: 7 },
    { vehicleType: 'motocikli', name: 'Piaggio', slug: 'piaggio', models: ['Beverly 300', 'Liberty 125', 'Medley 150'], isPrimary: true, order: 8 },
    { vehicleType: 'motocikli', name: 'Vespa', slug: 'vespa', models: ['GTS 300', 'Primavera 125', 'Sprint 50'], isPrimary: true, order: 9 },
    { vehicleType: 'motocikli', name: 'Harley-Davidson', slug: 'harley-davidson', models: ['Iron 883', 'Fat Boy', 'Street Glide', 'Pan America'], isPrimary: true, order: 10 },
    { vehicleType: 'motocikli', name: 'Aprilia', slug: 'aprilia', models: ['RS 660', 'Tuono V4', 'SR GT 200'], isPrimary: false },
    // KAMIONI – top 10
    { vehicleType: 'kamioni', name: 'Scania', slug: 'scania', models: ['R 450', 'R 500', 'G 410', 'P 320', 'S 500'], isPrimary: true, order: 1 },
    { vehicleType: 'kamioni', name: 'Volvo Trucks', slug: 'volvo-trucks', models: ['FH 460', 'FH 500', 'FM 440', 'FMX 540', 'FE 250'], isPrimary: true, order: 2 },
    { vehicleType: 'kamioni', name: 'MAN', slug: 'man', models: ['TGX 18.440', 'TGX 26.480', 'TGS 18.400', 'TGM 18.340'], isPrimary: true, order: 3 },
    { vehicleType: 'kamioni', name: 'Mercedes-Benz', slug: 'mercedes-benz-truck', models: ['Actros 1845', 'Actros 2651', 'Arocs 3240', 'Econic'], isPrimary: true, order: 4 },
    { vehicleType: 'kamioni', name: 'DAF', slug: 'daf', models: ['XF 480', 'CF 450', 'LF 220', 'XG+ 530'], isPrimary: true, order: 5 },
    { vehicleType: 'kamioni', name: 'Iveco', slug: 'iveco', models: ['S-Way 460', 'T-Way 440', 'Stralis', 'Eurocargo'], isPrimary: true, order: 6 },
    { vehicleType: 'kamioni', name: 'Renault Trucks', slug: 'renault-trucks', models: ['T 480', 'T 520', 'C 460', 'K 440'], isPrimary: true, order: 7 },
    // TRAKTORI – top 10
    { vehicleType: 'traktori', name: 'John Deere', slug: 'john-deere', models: ['6120M', '6155M', '6195M', '6E', '7R'], isPrimary: true, order: 1 },
    { vehicleType: 'traktori', name: 'New Holland', slug: 'new-holland', models: ['T6.180', 'T7.270', 'T8.410', 'T9'], isPrimary: true, order: 2 },
    { vehicleType: 'traktori', name: 'Massey Ferguson', slug: 'massey-ferguson', models: ['6714', '7712', '8727', '8S'], isPrimary: true, order: 3 },
    { vehicleType: 'traktori', name: 'Case IH', slug: 'case-ih', models: ['Puma 180', 'Maxxum 140', 'Optum 300', 'Magnum'], isPrimary: true, order: 4 },
    { vehicleType: 'traktori', name: 'Kubota', slug: 'kubota', models: ['M7060', 'M6060', 'B2601', 'L2501'], isPrimary: true, order: 5 },
    { vehicleType: 'traktori', name: 'Claas', slug: 'claas', models: ['Axion 960', 'Arion 660', 'Nexos 340', 'Xerion'], isPrimary: true, order: 6 },
    { vehicleType: 'traktori', name: 'Zetor', slug: 'zetor', models: ['Proxima 80', 'Forterra 120', 'Major 80', 'Crystal'], isPrimary: true, order: 7 },
    { vehicleType: 'traktori', name: 'Fendt', slug: 'fendt', models: ['500', '700', '900', '1000'], isPrimary: true, order: 8 },
    { vehicleType: 'traktori', name: 'Deutz-Fahr', slug: 'deutz-fahr', models: ['5D', '6D', '7D', '8D'], isPrimary: true, order: 9 },
    { vehicleType: 'traktori', name: 'Same', slug: 'same', models: ['Explorer', 'Solaris', 'Lamborghini'], isPrimary: true, order: 10 },
    // ČETVOROTOČKAŠI – top 10
    { vehicleType: 'cetvorotockasi', name: 'Polaris', slug: 'polaris', models: ['Sportsman 850', 'Ranger 1000', 'RZR XP 1000', 'Scrambler'], isPrimary: true, order: 1 },
    { vehicleType: 'cetvorotockasi', name: 'Can-Am', slug: 'can-am', models: ['Outlander 850', 'Maverick X3', 'Renegade', 'Defender'], isPrimary: true, order: 2 },
    { vehicleType: 'cetvorotockasi', name: 'Yamaha', slug: 'yamaha-atv', models: ['Grizzly 700', 'Kodiak 700', 'Raptor 700', 'Wolverine'], isPrimary: true, order: 3 },
    { vehicleType: 'cetvorotockasi', name: 'Honda', slug: 'honda-atv', models: ['FourTrax Rancher', 'FourTrax Foreman', 'TRX420', 'Pioneer'], isPrimary: true, order: 4 },
    { vehicleType: 'cetvorotockasi', name: 'CFMOTO', slug: 'cfmoto', models: ['CForce 600', 'CForce 800', 'ZForce 950', 'UForce'], isPrimary: true, order: 5 },
    { vehicleType: 'cetvorotockasi', name: 'Arctic Cat', slug: 'arctic-cat', models: ['Alterra', 'Wildcat', 'Prowler'], isPrimary: true, order: 6 },
    { vehicleType: 'cetvorotockasi', name: 'Kawasaki', slug: 'kawasaki-atv', models: ['Mule', 'Teryx', 'Brute Force'], isPrimary: true, order: 7 },
    { vehicleType: 'cetvorotockasi', name: 'Suzuki', slug: 'suzuki-atv', models: ['KingQuad', 'QuadSport'], isPrimary: true, order: 8 },
    // KOMBI – top 10
    { vehicleType: 'kombi', name: 'Mercedes-Benz', slug: 'mercedes-benz-kombi', models: ['Sprinter', 'Vito', 'V klasa', 'Citan'], isPrimary: true, order: 1 },
    { vehicleType: 'kombi', name: 'Volkswagen', slug: 'volkswagen-kombi', models: ['Transporter', 'Caddy', 'Crafter'], isPrimary: true, order: 2 },
    { vehicleType: 'kombi', name: 'Ford', slug: 'ford-kombi', models: ['Transit', 'Tourneo Connect', 'Tourneo Custom'], isPrimary: true, order: 3 },
    { vehicleType: 'kombi', name: 'Fiat', slug: 'fiat-kombi', models: ['Ducato', 'Doblo', 'Talento'], isPrimary: true, order: 4 },
    { vehicleType: 'kombi', name: 'Renault', slug: 'renault-kombi', models: ['Trafic', 'Master', 'Kangoo'], isPrimary: true, order: 5 },
    { vehicleType: 'kombi', name: 'Opel', slug: 'opel-kombi', models: ['Vivaro', 'Combo', 'Movano'], isPrimary: true, order: 6 },
    { vehicleType: 'kombi', name: 'Iveco', slug: 'iveco-kombi', models: ['Daily', 'Eurocargo'], isPrimary: true, order: 7 },
    { vehicleType: 'kombi', name: 'Citroën', slug: 'citroen-kombi', models: ['Berlingo', 'Jumper', 'SpaceTourer'], isPrimary: true, order: 8 },
    { vehicleType: 'kombi', name: 'Peugeot', slug: 'peugeot-kombi', models: ['Partner', 'Expert', 'Boxer'], isPrimary: true, order: 9 },
    { vehicleType: 'kombi', name: 'Toyota', slug: 'toyota-kombi', models: ['Proace', 'Hiace'], isPrimary: true, order: 10 },
    // AUTOBUSI – top 10
    { vehicleType: 'autobusi', name: 'Mercedes-Benz', slug: 'mercedes-benz-bus', models: ['Sprinter City', 'Citaro', 'Intouro', 'Tourismo'], isPrimary: true, order: 1 },
    { vehicleType: 'autobusi', name: 'MAN', slug: 'man-bus', models: ['Lion\'s City', 'Lion\'s Coach', 'Lion\'s Intercity'], isPrimary: true, order: 2 },
    { vehicleType: 'autobusi', name: 'Scania', slug: 'scania-bus', models: ['Citywide', 'Touring', 'Interlink'], isPrimary: true, order: 3 },
    { vehicleType: 'autobusi', name: 'Volvo', slug: 'volvo-bus', models: ['7900', '9700', '9900', 'B8R'], isPrimary: true, order: 4 },
    { vehicleType: 'autobusi', name: 'Iveco', slug: 'iveco-bus', models: ['Urbanway', 'Crossway', 'Magelys'], isPrimary: true, order: 5 },
    { vehicleType: 'autobusi', name: 'Setra', slug: 'setra', models: ['S 515', 'S 516', 'S 417', 'ComfortClass'], isPrimary: true, order: 6 },
    { vehicleType: 'autobusi', name: 'Neoplan', slug: 'neoplan', models: ['Cityliner', 'Skyliner', 'Tourliner'], isPrimary: true, order: 7 },
    { vehicleType: 'autobusi', name: 'Van Hool', slug: 'van-hool', models: ['A320', 'TX', 'Astron', 'ExquiCity'], isPrimary: true, order: 8 },
    { vehicleType: 'autobusi', name: 'Solaris', slug: 'solaris', models: ['Urbino', 'Interurbino', 'Vacanza'], isPrimary: true, order: 9 },
    { vehicleType: 'autobusi', name: 'Otokar', slug: 'otokar', models: ['Kent', 'Sultan', 'Vectio'], isPrimary: true, order: 10 },
    // KAMPERI – top 10
    { vehicleType: 'kamperi', name: 'Knaus', slug: 'knaus', models: ['BoxStar', 'Sport', 'Tabbert', 'T@B'], isPrimary: true, order: 1 },
    { vehicleType: 'kamperi', name: 'Hobby', slug: 'hobby', models: ['Premium', 'De Luxe', 'Excellent'], isPrimary: true, order: 2 },
    { vehicleType: 'kamperi', name: 'Bürstner', slug: 'burstner', models: ['Ixeo', 'Lyseo', 'Averso'], isPrimary: true, order: 3 },
    { vehicleType: 'kamperi', name: 'Fendt', slug: 'fendt-kamper', models: ['Bianco', 'Scenic'], isPrimary: true, order: 4 },
    { vehicleType: 'kamperi', name: 'Hymer', slug: 'hymer', models: ['Exsis', 'S-Model', 'B-Model'], isPrimary: true, order: 5 },
    { vehicleType: 'kamperi', name: 'Rapido', slug: 'rapido', models: ['A', 'M', 'V'], isPrimary: true, order: 6 },
    { vehicleType: 'kamperi', name: 'Adria', slug: 'adria', models: ['Matrix', 'Action', 'Compact'], isPrimary: true, order: 7 },
    { vehicleType: 'kamperi', name: 'Frankia', slug: 'frankia', models: ['I', 'L', 'M'], isPrimary: true, order: 8 },
    { vehicleType: 'kamperi', name: 'Chausson', slug: 'chausson', models: ['Flash', 'Welcome', 'Family'], isPrimary: true, order: 9 },
    { vehicleType: 'kamperi', name: 'Pilote', slug: 'pilote', models: ['Galand', 'Pacific', 'Explorer'], isPrimary: true, order: 10 },
    // PRIKOLICE – top 10
    { vehicleType: 'prikolice', name: 'Ifor Williams', slug: 'ifor-williams', models: ['GB85', 'GB105', 'LM126', 'LM146'], isPrimary: true, order: 1 },
    { vehicleType: 'prikolice', name: 'Bremach', slug: 'bremach', models: ['T-Rex', 'Dromo'], isPrimary: true, order: 2 },
    { vehicleType: 'prikolice', name: 'Krone', slug: 'krone', models: ['Cool Liner', 'Profi Liner', 'SDP'], isPrimary: true, order: 3 },
    { vehicleType: 'prikolice', name: 'Schmitz Cargobull', slug: 'schmitz-cargobull', models: ['Curtainsider', 'Box', 'Tipper'], isPrimary: true, order: 4 },
    { vehicleType: 'prikolice', name: 'Lamberet', slug: 'lamberet', models: ['FRIGO', 'MEGA', 'CURVED'], isPrimary: true, order: 5 },
    { vehicleType: 'prikolice', name: 'Tipper', slug: 'tipper', models: ['Standard', 'Low loader', 'Grain'], isPrimary: true, order: 6 },
    { vehicleType: 'prikolice', name: 'Kögel', slug: 'kogel', models: ['Cargo', 'Light', 'Fleet'], isPrimary: true, order: 7 },
    { vehicleType: 'prikolice', name: 'Wielton', slug: 'wielton', models: ['Semi', 'Dump', 'Tank'], isPrimary: true, order: 8 },
    { vehicleType: 'prikolice', name: 'Tirsan', slug: 'tirsan', models: ['Semi', 'Lowbed'], isPrimary: true, order: 9 },
    { vehicleType: 'prikolice', name: 'Zasław', slug: 'zaslaw', models: ['Platform', 'Tipper', 'Tanker'], isPrimary: true, order: 10 },
  ];

  const makesModels = [...automobiliEntries, ...makesModelsRest];

  for (const { vehicleType, name, slug, models, isPrimary = false, order = 0 } of makesModels) {
    if (models.length === 0) continue; // skip empty
    const make = await prisma.vehicleMake.upsert({
      where: { slug_vehicleType: { slug, vehicleType } },
      create: { name, slug, vehicleType, order, isPrimary },
      update: { name, order, isPrimary }
    });
    for (let i = 0; i < models.length; i++) {
      const modelName = models[i];
      const modelSlug = modelName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await prisma.vehicleModel.upsert({
        where: { makeId_slug: { makeId: make.id, slug: modelSlug } },
        create: { makeId: make.id, name: modelName, slug: modelSlug, vehicleType, isPrimary: i < 5 },
        update: { name: modelName, vehicleType }
      });
    }
  }
  console.log('Seed VehicleMake/VehicleModel: automobili, motocikli, kamioni, traktori, cetvorotockasi, kombi, autobusi, kamperi, prikolice (top 10 isPrimary).');

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  if (adminEmail) {
    const updated = await prisma.user.updateMany({
      where: { email: adminEmail },
      data: { role: Role.ADMIN }
    });
    if (updated.count > 0) console.log('Admin postavljen za:', adminEmail);
    else console.warn('SEED_ADMIN_EMAIL nije pronađen u bazi:', adminEmail);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
