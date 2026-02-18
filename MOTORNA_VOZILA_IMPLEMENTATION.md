# Motorna vozila – implementacija

Kratak pregled promjena, migracija i upotrebe admina za Make/Model.

---

## 1. Fajlovi koje su promijenjeni / dodani

### Backend (Express + Prisma)

| Fajl | Promjena |
|------|----------|
| `prisma/schema.prisma` | Na modelu `Ad` dodana polja `make`, `model`, `vehicleSpecs` (Json). Novi modeli `VehicleMake`, `VehicleModel` (veza make → models). Indeksi na `Ad`: `kategorija+potkategorija`, `make`. |
| `prisma/migrations/20260217000000_motorna_vozila_make_model_vehicle_specs/migration.sql` | Migracija: dodavanje kolona na `Ad`, kreiranje tabela `VehicleMake`, `VehicleModel` i indeksa. |
| `prisma/seed.ts` | Seed za `VehicleMake` i `VehicleModel` (kamioni, traktori, četvorotočkaši) – brendovi i po nekoliko modela po brendu. |
| `src/config/vehicleTaxonomy.ts` | **Novi.** Taxonomija: `MOTORNA_VOZILA_CATEGORY_ID`, `MOTORNA_VOZILA_SUBCATEGORIES`, `COMMON_VEHICLE_FILTER_KEYS`, `SPEC_FILTER_KEYS_BY_SUBCATEGORY`, `getAllowedFilterKeysForSubcategory`, `isSpecParamForSubcategory`, `getSpecFilterKeys`. |
| `src/routes/ads.ts` | GET `/api/ads`: podrška za `kategorija=motorna_vozila`, `subcategory`, make, model, lokacija, vehicleSpecs (path/equals). Helper `buildVehicleWhere`. POST/PATCH: prihvat i snimanje `make`, `model`, `vehicleSpecs`. Za `motorna_vozila` paginacija preko `skip`/`take` + `count`. |
| `src/routes/vehicles.ts` | **Novi.** GET `/api/vehicles/makes?vehicleType=...`, GET `/api/vehicles/models?makeId=...` ili `?makeSlug=...&vehicleType=...`. |
| `src/routes/admin.ts` | Admin CRUD: GET/POST/PATCH `vehicle-makes`, GET/POST/PATCH/DELETE `vehicle-makes/:makeId/models` i `vehicle-models/:id`. |
| `src/index.ts` | Registracija ruta: `app.use('/api/vehicles', vehicleRoutes)`. |

### Frontend (React + TS)

| Fajl | Promjena |
|------|----------|
| `constants.tsx` | Nova kategorija `Motorna vozila` (id: `motorna_vozila`, slug: `motorna-vozila`). `MOTORNA_VOZILA_ID`, `MOTORNA_VOZILA_SLUG`, `MOTORNA_VOZILA_SUBCATEGORIES`. U `VEHICLE_FIELDS_CONFIG` dodani: `kombi`, `autobusi`, `prikolice`, `kamperi`. |
| `App.tsx` | `getAdsQueryFromLocation` – iz patha i query-ja gradi parametre za `/api/ads` (kategorija, subcategory, filteri). `fetchAds` prima opcioni `queryParams` i koristi ih u URL-u. Na promjenu `location.pathname`/`location.search` ponovno učitava oglase. Marketplace: kada je kategorija „Motorna vozila”, prikazuje selector podkategorija (Sve + lista iz `MOTORNA_VOZILA_SUBCATEGORIES`). Za odabranu podkategoriju prikazuje `FilterPanel` s odgovarajućim poljima (zajednički + spec). Filtriranje liste: `kategorija === motorna_vozila` i opciono `potkategorija === selectedVehicleSubcategory`. |

### Testovi

| Fajl | Promjena |
|------|----------|
| `tests/vehicleTaxonomy.test.ts` | **Novi.** Unit testovi: `getAllowedFilterKeysForSubcategory`, `isSpecParamForSubcategory`, `getSpecFilterKeys` (kamioni: osovine/nosivost/euro; traktori: radniSati/kabina; ATV: kubikaža). |
| `tests/ads.test.ts` | Mock za `prisma.ad.count`. Sekcija „Motorna vozila”: smoke testovi za GET `/api/ads?kategorija=motorna_vozila&subcategory=kamioni` i `...&subcategory=traktori` – provjera da `where` ima `kategorija` i `potkategorija`. |

---

## 2. DB migracije i seed

- **Migracija**  
  Iz roota projekta:
  ```bash
  npx prisma migrate deploy
  ```
  ili za development:
  ```bash
  npx prisma migrate dev
  ```

- **Seed (Make/Model za kamione, traktore, četvorotočkaše)**  
  Nakon što je migracija primijenjena:
  ```bash
  npx prisma db seed
  ```
  U bazu se unose brendovi i modeli za `vehicleType`: kamioni, traktori, cetvorotockasi (curated lista, bez tuđeg sadržaja).

---

## 3. Kako dodati nove modele/brendove preko admina

Admin mora biti prijavljen (token u headeru). Base URL: `/api/admin`.

### Proizvođači (Make)

- **Lista (opciono po tipu vozila)**  
  `GET /api/admin/vehicle-makes?vehicleType=kamioni`  
  Vraća sve make-ove (ili samo za `vehicleType`).

- **Dodavanje**  
  `POST /api/admin/vehicle-makes`  
  Body (JSON):
  ```json
  {
    "name": "Solis",
    "slug": "solis",
    "vehicleType": "traktori",
    "order": 0
  }
  ```
  `vehicleType` mora biti jedan od: `automobili`, `motocikli`, `kamioni`, `traktori`, `cetvorotockasi`, `kombi`, `autobusi`, `prikolice`, `kamperi`.

- **Izmjena**  
  `PATCH /api/admin/vehicle-makes/:id`  
  Body (sve opciono): `{ "name": "...", "slug": "...", "order": 0 }`.

### Modeli

- **Lista modela za make**  
  `GET /api/admin/vehicle-makes/:makeId/models`

- **Dodavanje modela**  
  `POST /api/admin/vehicle-makes/:makeId/models`  
  Body:
  ```json
  { "name": "6120M", "slug": "6120m" }
  ```
  Ako se `slug` ne pošalje, generiše se iz `name` (lowercase, razmaci u crtice).

- **Izmjena modela**  
  `PATCH /api/admin/vehicle-models/:id`  
  Body (opciono): `{ "name": "...", "slug": "..." }`.

- **Brisanje modela**  
  `DELETE /api/admin/vehicle-models/:id`

Svi zahtjevi za admin rute zahtijevaju header: `Authorization: Bearer <admin JWT>`.

---

## 4. Sažetak ponašanja

- **Kategorija „Motorna vozila”** ima podkategorije: Automobili, Motocikli, Kamioni, Traktori, Četvorotočkaši, Kombi, Autobusi, Prikolice, Kamperi.
- **Zajednički filteri** (make, model, godište, cijena, lokacija, gorivo, mjenjač, kilometraža, stanje, sort) + **specifični** po podkategoriji (npr. kamioni: tip, klasa nosivosti, broj osovina, euro; traktori: radni sati, kabina; itd.).
- **Backend** pri GET `/api/ads` prihvata samo relevantne parametre za odabranu subkategoriju i filtrira po `kategorija`, `potkategorija`, `make`, `model` i `vehicleSpecs` (JSON path/equals).
- **Frontend** ne mijenja postojeći dizajn; dodaje se samo data layer, konfiguracija filtera i mapping (selector podkategorija + dinamički FilterPanel).
- **Make/Model** za kamione, traktore i ATV dolaze iz baze (VehicleMake/VehicleModel), seed-om + admin CRUD; automobili/motocikli mogu koristiti postojeći katalog ili kasnije API.

Ako želiš, u sledećem koraku mogu predložiti konkretne UI komponente za admin stranicu (npr. u Admin panelu) za upravljanje Make/Model iz pregledača.
