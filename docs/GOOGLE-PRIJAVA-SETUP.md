# Google prijava – podešavanje

## 1. Backend mora raditi

Kad klikneš "Prijavi se sa Google-om", preglednik šalje zahtjev na **backend** (port 3001), ne na Vite (5173). Vite samo prosljeđuje `/api` na backend.

- **Uvijek pokreni:** `npm run dev` (podigne i backend i frontend).
- Ako pokreneš samo `npm run frontend`, backend ne radi i dobit ćeš **"This page isn't working"** ili "localhost is unable to handle this request".

Provjera: otvori u browseru **http://localhost:3001/health** – treba da vrati neki odgovor (npr. JSON). Ako ne radi, backend nije pokrenut.

---

## 2. Google Cloud Console

1. Idi na [Google Cloud Console](https://console.cloud.google.com/) → izaberi projekat (ili kreiraj novi).
2. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized redirect URIs** – dodaj tačno:
   - Za lokalni razvoj: `http://localhost:3001/api/auth/google/callback`
   - Za produkciju: `https://tvoj-api-domen.com/api/auth/google/callback`
5. Kopiraj **Client ID** i **Client secret**.

---

## 3. .env

U rootu projekta u `.env` dodaj (ili ispuni):

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

Za lokalni razvoj backend koristi port **3001**, pa callback URL mora biti `http://localhost:3001/api/auth/google/callback` (to je već ispravljeno u kodu).

---

## 4. Redoslijed

1. Pokreni `npm run dev`.
2. Provjeri http://localhost:3001/health.
3. U .env stavi `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET`.
4. U Google Console stavi redirect URI: `http://localhost:3001/api/auth/google/callback`.
5. Osvježi stranicu prijave i probaj "Prijavi se sa Google-om".

Ako i dalje ne radi, u terminalu gdje radi backend provjeri da li se pri kliku pojavi neka greška (npr. 503 ako nisu postavljeni Google ključevi).
