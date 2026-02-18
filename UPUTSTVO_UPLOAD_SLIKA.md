# Kako uključiti upload slika za oglase

Slijedi korak-po-korak kako da upload slika radi (Supabase Storage + .env).

---

## Korak 1: Otvori Supabase projekat

1. Uđi na **https://supabase.com** i prijavi se.
2. Otvori svoj projekat (isti onaj iz koga koristiš bazu – već imaš `DATABASE_URL` iz tog projekta).

---

## Korak 2: Napravi bucket za slike

1. U lijevom meniju klikni **Storage** (ikona kante).
2. Klikni **New bucket**.
3. **Name:** upiši točno: `ads`
4. **Public bucket:** uključi (da slike budu javno vidljive preko linka).
5. Klikni **Create bucket**.

Bucket `ads` je sada kreiran.

---

## Korak 3: Dozvole za bucket (policy)

1. Ostani na **Storage**.
2. Klikni na bucket **ads**.
3. Otvori **Policies** (ili "New policy" / "RLS").
4. Treba da **javno čitanje** radi (za "Public bucket" to je obično već uključeno).
5. Za **upload** (da backend može da šalje slike):
   - Klikni **New policy** ili uredi postojeću.
   - Možeš koristiti predložak "Allow all" za **INSERT** za autentifikovane korisnike, ili za **service_role** (backend koristi service key).
   - Najjednostavnije: u **Policies** za bucket `ads` dodaj policy koja dozvoljava **INSERT** i **UPDATE** za role `service_role` (ili "Enable read access for all users" za čitanje i "Allow uploads" za zapis ako ti interfejs nudi to).

Ako ne vidiš Policies ili RLS, u nekim verzijama Supabasea je dovoljno da je bucket **Public** – backend šalje slike sa **Service role** ključem koji zaobilazi RLS. Probaj prvo Korak 4; ako upload padne sa greškom "new row violates row-level security", vrati se i dodaj policy za `service_role` na bucketu `ads`.

---

## Korak 4: SUPABASE_URL i SUPABASE_SERVICE_KEY u .env

1. U Supabaseu u lijevom meniju klikni **Project Settings** (zupčanik).
2. U lijevom podmeniju klikni **API**.
3. Na stranici vidiš:
   - **Project URL** – nešto kao `https://abcdefghijk.supabase.co`
   - **Project API keys** – **anon (public)** i **service_role (secret)**.

4. Otvori u editoru fajl **`.env`** u rootu projekta (pored `package.json`).

5. Na dno fajla dodaj dvije nove linije (zamijeni vrijednosti svojim):

```env
SUPABASE_URL=https://tvoj-projekt-ref.supabase.co
SUPABASE_SERVICE_KEY=tvoj-service-role-key-ovdje
```

- **SUPABASE_URL:** kopiraj **Project URL** iz Supabase (API stranica).
- **SUPABASE_SERVICE_KEY:** kopiraj **service_role** ključ (dugi string; označen kao secret – ne dijelji ga i ne commituj u git).

Primjer kako može izgledati (s lažnim vrijednostima):

```env
SUPABASE_URL=https://yelvnbadfntnfmsjtdsg.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllbHZuYmFkZm50bmZtc2p0ZHNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYz...
```

6. Sačuvaj `.env`.

---

## Korak 5: Restart backenda

1. Ako je backend pokrenut (`npm run dev` ili `npm run dev:host`), zaustavi ga (Ctrl+C u terminalu).
2. Ponovo pokreni:

```bash
npm run dev
```

ili, za pristup sa telefona:

```bash
npm run dev:host
```

Backend sada učitava nove varijable iz `.env`.

---

## Korak 6: Provjera u aplikaciji

1. Otvori aplikaciju u browseru (npr. http://localhost:5173).
2. Prijavi se (moraš biti ulogovan).
3. Klikni **Dodaj oglas** (ili "Objavi" u meniju) i popuni formu do koraka sa slikama.
4. Dodaj jednu ili više slika (Dodaj → odaberi JPEG/PNG/WebP, max 5 MB po slici).
5. Popuni ostala obavezna polja i klikni **Objavi Oglas**.

- Ako sve radi: oglas će se objaviti sa slikama; na listi i na detalju oglasa videćeš slike.
- Ako vidiš poruku tipa „Upload slika nije konfigurisan…” ili „Greška pri uploadu slike”: provjeri da li su u `.env` točno upisani `SUPABASE_URL` i `SUPABASE_SERVICE_KEY` (bez razmaka, u navodnicima ako .env zahtijeva) i da si restartovao backend.

---

## Sažetak

| Šta | Gdje |
|-----|------|
| Bucket za slike | Supabase → Storage → New bucket → ime `ads`, Public ✓ |
| URL projekta | Supabase → Project Settings → API → **Project URL** → u .env kao `SUPABASE_URL` |
| Service key | Supabase → Project Settings → API → **service_role** (secret) → u .env kao `SUPABASE_SERVICE_KEY` |
| Restart | Zaustavi backend, pa opet `npm run dev` (ili `npm run dev:host`) |

Ako nešto od ovoga nemaš (npr. ne vidiš Service role key), napiši šta tačno vidiš u Supabase (Storage / API) pa mogu prilagoditi korake.
