# Plan: Unapređenje kategorija i mapa – Poveži.ME

**Datum:** 2026-02  
**Cilj:** Proširiti funkcionalnost na sve kategorije (ne samo motorna vozila i nekretnine) i omogućiti tačnu lokaciju oglasa putem mape.

---

## 1. TRENUTNO STANJE

### Kategorije (15 ukupno)

| Kategorija | Slug | Specifični detalji | Filteri | Napomena |
|------------|------|-------------------|---------|----------|
| **Motorna vozila** | motorna-vozila | ✅ Marka, model, godište, kilometraža, gorivo, mjenjač, itd. po podkategoriji | ✅ Potpuni | 9 podkategorija (automobili, motocikli, kamioni…) |
| **Nekretnine** | nekretnine | ✅ Tip, tip ponude, kvadratura, sobe, sprat, amenities | ✅ Tip, kvadratura, sobe, sprat | |
| **Auto dijelovi** | auto-dijelovi | ⚠️ Samo "Stanje" | ❌ | Bez marka/model vozila |
| **Usluge** | usluge | ❌ | ❌ | Generički oglas |
| **Bijela tehnika** | bijela-tehnika | ❌ | ❌ | |
| **Namještaj** | namjestaj | ❌ | ❌ | |
| **Poljoprivreda** | poljoprivreda | ❌ | ❌ | |
| **Tehnika** | tehnika | ❌ | ❌ | |
| **Kućni ljubimci** | kucni-ljubimci | ❌ | ❌ | |
| **Moda** | moda | ❌ | ❌ | |
| **Poslovi** | poslovi | ❌ | ❌ | |
| **Sport i rekreacija** | sport-i-rekreacija | ❌ | ❌ | |
| **Građevina i alati** | gradjevina-i-alati | ❌ | ❌ | |
| **Pokloni i cvijeće** | pokloni-i-cvijece | ❌ | ❌ | |
| **Za djecu** | za-djecu | ❌ | ❌ | Nova kategorija |
| **Ostalo** | ostalo | ❌ | ❌ | |

### Mapa – trenutno stanje

- **MarketplaceMap** – postoji, Leaflet, prikazuje oglase na mapi
- **Toggle** – lista / mapa u Marketplace-u
- **Lokacija** – `Ad.lokacija` je **string** (npr. "Podgorica") – samo grad
- **Koordinati** – `LOCATION_COORDS` mapira grad → centar grada [lat, lng]
- **Problem** – svi oglasi u istom gradu dijele isti pin (mali offset). **Nema tačne adrese.**

### Šta nema u bazi

- `Ad` model **nema** polja `lat`, `lng` (koordinate)
- Nema "odabir na mapi" pri objavi
- Nema filtera "u krugu od X km"
- Nema sortiranja po udaljenosti

---

## 2. PREPORUKE – MAPA I TAČNA LOKACIJA

### Faza A: Baza i osnovni odabir (prioritet visok)

1. **Migracija Prisma**
   - Dodati `lat Decimal?` i `lng Decimal?` (ili `Float?`) na model `Ad`
   - Opciono: `adresa String?` za prikaz (npr. "Bulevar Ivana Crnojevića 23")

2. **AddAd / EditAd – map picker**
   - Opciono polje: "Odaberi tačnu lokaciju na mapi"
   - Leaflet map sa klikom → postavlja lat/lng
   - Fallback: ako korisnik ne odabere, koristi se centar grada iz `LOCATION_COORDS[lokacija]`
   - Prikaz u formi: "Lokacija: Podgorica" + dugme "Prikaži na mapi / Promijeni lokaciju"

3. **MarketplaceMap – ažurirati**
   - Ako oglas ima `lat`/`lng` → pin na toj poziciji
   - Ako nema → fallback na `LOCATION_COORDS[ad.lokacija]` (kao sada)

4. **Ad detail – mapa**
   - Na stranici oglasa prikazati malu mapu sa pinom (ako ima koordinate)

### Faza B: Filter i sortiranje (prioritet srednji)

5. **Filter "U blizini"**
   - Za prijavljene korisnike: "Oglasi u krugu od 5 / 10 / 25 / 50 km" (uz dozvolu geolokacije)
   - Backend: POSTGIS ili `haversine` formula u Prisma/raw query

6. **Sortiranje**
   - "Sortiraj po: Udaljenosti" (kad je uključen filter lokacije)

---

## 3. PREPORUKE – KATEGORIJE (šta dodati)

### Auto dijelovi
- **Za vozilo**: marka, model (opciono) – "Dio za Honda Civic 2015"
- **Tip dijela**: motor, transmisija, felne, gume, elektronika, karoserija, interijer, ostalo
- **Stanje**: već postoji

### Usluge
- **Tip**: nudim uslugu / tražim uslugu
- **Cijena**: po satu, po danu, po projektu, dogovor
- **Područje rada**: gradovi ili "cijela CG"

### Bijela tehnika
- **Tip**: frižider, zamrzivač, mašina za pranje, sušilica, šporet, klima, ostalo
- **Marka**: opciono
- **Energetska klasa**: A+++, A++, A+, A, B, C, ostalo

### Namještaj
- **Tip**: soba, krevet, stolica, stol, ormar, polica, ostalo
- **Materijal**: drvo, metal, plastika, kombinacija
- **Stanje**: novo, polovno, oštećeno

### Poljoprivreda
- **Tip**: traktori i oprema, sjeme, đubrivo, stočna hrana, alati, ostalo
- **Za vozila**: ako je oprema za traktor, marka/model

### Tehnika
- **Tip**: računari, laptopi, telefoni, tableti, TV, audio, gaming, ostalo
- **Marka**: opciono
- **Stanje**: novo, polovno, oštećeno

### Kućni ljubimci
- **Vrsta**: pas, mačka, ptice, ribe, ostalo
- **Starost**: opciono
- **Vakcinisan**: da / ne / ne znam

### Moda
- **Tip**: odjeća, obuća, torbe, nakit, ostalo
- **Veličina**: S, M, L, XL, broj (ob了解了ća)
- **Stanje**: novo, polovno

### Poslovi
- **Tip**: full-time, part-time, freelance, praksa
- **Plata**: raspon (opciono, diskretno)
- **Lokacija posla**: grad ili "remote"

### Sport i rekreacija
- **Tip**: oprema za fitness, bicikli, skijanje, camping, vodeni sportovi, ostalo
- **Stanje**: novo, polovno

### Građevina i alati
- **Tip**: materijali, alati, strojevi, ostalo
- **Stanje**: novo, polovno

### Pokloni i cvijeće
- **Tip**: poklon, cvijeće, torte, ostalo
- **Povod**: rođendan, vjenčanje, sahrana, ostalo (opciono)

### Za djecu
- **Tip**: odjeća, obuća, igračke, kolica i dječija vozila, krevetac i posteljina, školski pribor, sport i igra, ostalo
- **Uzrast**: 0–6 mjeseci, 6–12 mjeseci, 1–3 godine, 3–6 godina, 6–12 godina, 12+ godina
- **Veličina**: opciono (za odjeću/obuću – brojevi 20–42 ili S/M/L)
- **Stanje**: novo, polovno, oštećeno
- **Marka**: opciono

---

## 4. IMPLEMENTACIJSKI REDOSLIJED

### Kratki rok (1–2 sedmice)
1. **Mapa – tačna lokacija**
   - Migracija: `lat`, `lng` na Ad
   - Map picker u AddAd/EditAd (opciono)
   - MarketplaceMap koristi lat/lng kad postoji
   - Ad detail: mali prikaz mape

### Srednji rok (2–4 sedmice)
2. **Auto dijelovi** – tip dijela, marka/model vozila
3. **Usluge** – tip, način naplate
4. **Bijela tehnika** – tip, energetska klasa
5. **Namještaj** – tip, materijal

### Duži rok (1–2 mjeseca)
6. **Tehnika, Moda, Sport** – specifični filteri
7. **Kućni ljubimci** – vrsta, starost
8. **Za djecu** – tip, uzrast, veličina, stanje
9. **Poslovi** – tip zaposlenja
10. **Filter "u blizini"** – geolokacija + radius
11. **Sort po udaljenosti**

---

## 5. TEHNIČKE NAPOMENE

### Prisma – lat/lng
```prisma
// prisma/schema.prisma - Ad model
lat  Float?
lng  Float?
```
Indeks za geo queries (optional): `@@index([lat, lng])` – za buduće "radius" pretrage.

### details JSON
Većina kategorija koristi `Ad.details` (JSON). Konfiguracija u `constants.tsx` – `VEHICLE_FIELDS_CONFIG` ili novi `CATEGORY_DETAILS_CONFIG` za ostale kategorije.

### Backend
- `src/routes/ads.ts` – createAdSchema, updateAdSchema: dodati `lat`, `lng`, `adresa`
- GET `/api/ads`: filtrirati po radiusu (raw SQL sa haversine ili PostGIS) – Faza B

### Frontend
- AddAd: nova sekcija "Lokacija na mapi" – Leaflet component, klik postavlja lat/lng
- EditAd: isto
- AdCard / AdDetail: prikaz lokacije (grad + opciono mali map preview)

---

## 6. ZAKLJUČAK

- **Mapa svuda** – da, preporučuje se: tačna lokacija u formi, prikaz na listi/detailu, filter po udaljenosti.
- **Ostale kategorije** – treba ih postepeno obogaćivati specifičnim poljima i filterima, slično motornim vozilima i nekretninama.
- **Prioritet** – prvo lat/lng + map picker (najveća vrijednost za korisnike), zatim auto dijelovi i usluge.
