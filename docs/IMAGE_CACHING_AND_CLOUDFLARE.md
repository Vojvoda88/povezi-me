# Kesiranje slika (24h) i Cloudflare

## Šta je urađeno u kodu

- Pri **uploadu** slike (main + thumb) na Supabase postavlja se **Cache-Control: max-age=86400** (24 sata).
- Browser će slike keširati 24h. Supabase Smart CDN (Pro plan) takođe poštuje ovaj header.

**Fajl:** `src/routes/ads.ts` – opcija `cacheControl: '86400'` na oba `.upload()` poziva.

---

## Opcija 1: Samo Cache-Control (već aktivno)

- **Nove** slike koje se uploaduju od sada imaju 24h cache u browseru.
- **Stare** slike u bucketu nemaju header – ili ih ostaviš kako jesu, ili jednom uradiš re-upload / skriptu koja postavlja metadata (ako Supabase to podržava za postojeće objekte).

**Bez Cloudflarea:** samo browser cache, ponovni posjeti istog korisnika su brži. Prvi učitavanje i dalje ide direktno na Supabase.

---

## Opcija 2: Cloudflare ispred celog sajta

**Korak 1 – Domen na Cloudflare**

1. Registruj se na [cloudflare.com](https://www.cloudflare.com).
2. Add site → unesi domen (npr. `povezi.me`).
3. Izvrši uputstva (promjena nameservera kod registrara na Cloudflare NS).

**Korak 2 – DNS**

- **A** ili **CNAME** za `povezi.me` → Vercel (ili gdje ti je frontend).
- **A** ili **CNAME** za `api.povezi.me` → Render (ili gdje ti je backend).
- Proxy uključen (narančasti oblak) da sav saobraćaj ide kroz Cloudflare.

**Korak 3 – Caching**

- **Caching → Configuration:** Cache Level = Standard.
- **Caching → Cache Rules** (ili Page Rules): za static assets (JS, CSS, slike sa tvog domena) možeš postaviti **Cache TTL = 24 hours** ili **1 day**.

**Rezultat:** HTML/JS/CSS i sve što ide sa tvog domena kešira se na Cloudflare edge. **Slike sa Supabasea** i dalje idu direktno na `xxx.supabase.co` – Cloudflare ih ne vidi, pa ih ne kešira. Zato za “globalno keširanje svih slika” treba Opcija 3.

---

## Opcija 3: Globalno keširanje slika preko Cloudflare (proxy)

Da bi Cloudflare keširao i tvoje slike sa Supabasea, zahtjev za sliku mora proći kroz tvoj domen (ili Worker).

### 3a) Image proxy na tvom backendu (Render)

1. **Nova ruta** na backendu, npr. `GET /api/img?url=...` (URL encodovan Supabase public URL).
2. Backend:
   - Validira da `url` vodi na tvoj Supabase storage domen (sigurnosno).
   - `fetch(url)` → dobija sliku.
   - Vraća je sa headerima:  
     `Cache-Control: public, max-age=86400` (24h),  
     `Content-Type: image/webp` (ili iz responsea).
3. **Frontend:** umjesto direktnog Supabase URL-a koristiš:  
   `https://api.povezi.me/api/img?url=<encoded_supabase_url>`.
4. **Cloudflare** ispred `api.povezi.me`:  
   - Cache Rule za `/api/img*`: Cache eligibility = Eligible for cache, Cache TTL = 24 hours.  
   - Prvi zahtjev za sliku → backend → Supabase; Cloudflare kešira odgovor. Sljedećih 24h drugi korisnici dobijaju sliku sa edge-a.

**Mana:** svi image requesti prvo pogode tvoj backend (Render), pa Cloudflare. Ako nema cache, backend radi fetch prema Supabaseu. Zato je važno da Cloudflare zaista kešira (Cache Rule za `/api/img`).

### 3b) Cloudflare Worker (bez opterećivanja Rendera)

1. **Worker** na Cloudflareu:
   - Prima npr. `https://povezi.me/cdn/img?url=...`.
   - Validira da `url` ide na tvoj Supabase storage.
   - `fetch(url)` → vraća response sa headerima:  
     `Cache-Control: public, max-age=86400`.
2. **Cloudflare** automatski kešira odgovore Workera prema Cache API ili standardnim pravilima.
3. **Frontend:** za slike koristiš `https://povezi.me/cdn/img?url=...` (ili poseban subdomen za Worker).

**Prednost:** Render se uopšte ne opterećuje; sve ide Cloudflare → Supabase (prvi put), zatim Cloudflare edge.

---

## Preporuka po fazama

1. **Odmah:** Cache-Control na uploadu (već u kodu) – 24h browser cache za nove slike.
2. **Kad imaš domen:** Stavi cijeli sajt iza Cloudflarea (frontend + API) – brži HTML/JS/CSS i API odgovori koje Cloudflare može keširati.
3. **Kad želiš “globalno keširanje svih slika”:**  
   - Ili **3a** (proxy ruta na Renderu + Cache Rule za `/api/img`),  
   - Ili **3b** (Cloudflare Worker kao image proxy).  
   Oba daju 24h keš na edge-u; Worker ne opterećuje Render.

---

## Postojeće slike u bucketu

- Bez dodatne akcije nemaju `Cache-Control` (osim ako Supabase već ne dodaje neki default).
- Opcije:
  - Ostaviti kako jesu (nove će imati 24h).
  - Jednokratno u Supabase Dashboardu / Storage API postaviti metadata (cacheControl) na stare objekte, ako postoji podrška.
  - Ili kasnije uvesti proxy (3a/3b) – tada će i stare slike, kad se učitavaju preko proxyja, dobiti 24h cache na Cloudflareu.

---

## Sažetak

- **U kodu:** sve nove slike na Supabase dobijaju **24h cache** (Cache-Control) pri uploadu.
- **Cloudflare:** najbolje je ga koristiti ispred cijelog sajta; za globalno keširanje **svih** slika dodaj image proxy (backend ruta ili Worker) i 24h Cache Rule na Cloudflareu.
