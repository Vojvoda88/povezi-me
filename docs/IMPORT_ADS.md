# Uvoz oglasa sa drugih sajtova

Skripta `scripts/import-ads.ts` povlači oglase sa drugih izvora (RSS feed ili vlastiti parser za **dozvoljene** izvore) i kreira ih u bazi pod "import" korisnikom.

**Važno:** Ne koristi skrejpovanje tuđih sajtova (npr. oglasnih portala) bez pismene saglasnosti operatora tog sajta. To može predstavljati kršenje uslova korištenja, autorskih prava i zaštite podataka. Koristi samo RSS/API ili izvore za koje imaš dozvolu.

## Šta ti treba

- **Baza:** `DATABASE_URL` u `.env`
- **Config:** JSON fajl sa listom izvora (RSS URL ili custom modul)

## Brzi start

1. Kopiraj primjer konfiguracije:
   ```bash
   cp scripts/import-ads.config.example.json scripts/import-ads.config.json
   ```
2. Uredi `scripts/import-ads.config.json`: stavi stvarne RSS linkove ili custom source (vidi dolje).
3. Pokreni:
   ```bash
   npm run import-ads
   ```
   Ili sa drugim config fajlom:
   ```bash
   npx ts-node scripts/import-ads.ts --config=path/to/config.json
   ```

## Format config fajla

```json
{
  "importUserEmail": "import@povezi.me",
  "defaultKategorija": "ostalo",
  "defaultLokacija": "Crna Gora",
  "sources": [
    {
      "name": "jedinstveno-ime-izvora",
      "type": "rss",
      "url": "https://.../feed.xml",
      "kategorija": "ostalo",
      "lokacija": "Crna Gora"
    }
  ]
}
```

- **importUserEmail** – email korisnika koji će "posjedovati" uvezene oglase. Ako korisnik ne postoji, biće kreiran (ne koristi se za prijavu).
- **defaultKategorija / defaultLokacija** – vrijede ako source ne navede svoje.
- **sources** – niz izvora.

### Tip izvora: `rss`

- **url** – URL RSS/XML feeda.
- Skripta parsira `<item>`, izvlači: title, link, description, prvu sliku (enclosure ili img u description), cijenu iz teksta (broj + €/eur).

### Tip izvora: `custom`

Za sajtove koji nemaju RSS, možeš napisati svoj parser u Node.js modulu:

```json
{
  "name": "moj-sajt",
  "type": "custom",
  "modulePath": "scripts/fetchers/moj-sajt.js",
  "kategorija": "vozila",
  "lokacija": "Podgorica"
}
```

Modul mora exportovati:

```js
async function fetchListings(config) {
  // config = { name, type, url?, kategorija?, lokacija?, ... }
  const res = await fetch(config.url || '...');
  const html = await res.text();
  // parse HTML i vrati niz:
  return [
    {
      externalId: 'jedinstveni-id-sa-sajta',
      naslov: 'Naslov oglasa',
      opis: 'Opis...',
      cijena: 123.45,
      kategorija: 'motorna_vozila',
      lokacija: 'Podgorica',
      imageUrls: ['https://...'],
      sourceUrl: 'https://...'  // opciono
    }
  ];
}
module.exports = { fetchListings };
```

- **externalId** – koristi se za dedupe: isti oglas neće biti uvezen dvaput (po source name + externalId).
- **kategorija** – mora odgovarati kategorijama u aplikaciji (npr. `motorna_vozila`, `nekretnine`, `ostalo`).

## Deduplikacija

Za svaki oglas skripta računa `dedupeKey = import:${source.name}:${externalId}`. Ako takav oglas već postoji za import korisnika, preskače se. Zato možeš pokretati skriptu više puta (npr. cron) – novi oglasi se dodaju, postojeći se ne dupliraju.

## Pravna napomena

- Scraping može biti protiv **Uslova korištenja** nekih sajtova. Pre uvoda provjeri da li smiješ koristiti njihove podatke i na koji način.
- Ako postoji **RSS** ili **javni API**, prednost daj tim načinima.
- Poštuj **robots.txt** i ne preopterećuj tuđe servere (rate limit, pauze između zahtjeva).

## Opciono: postojeći korisnik

Ako želiš da uvezene oglase vodi određeni postojeći korisnik umjesto automatski kreiranog "import" naloga, u `.env` postavi:

```env
IMPORT_USER_ID=cuid_tog_korisnika
```

Tada se `importUserEmail` iz configa ne koristi za kreiranje – svi uvezeni oglasi idu na tog korisnika.
