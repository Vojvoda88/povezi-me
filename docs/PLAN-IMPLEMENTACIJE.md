# Detaljan plan implementacije – cjelina po cjelina

Plan se izvršava redom; svaka cjelina je završena prije prelaska na sljedeću.

---

## Cjelina 1: Sortiraj po (UI) ✅
- **Šta:** Dropdown "Sortiraj po" u marketplace toolbaru (pored Filteri).
- **Opcije:** Najnoviji (istaknuti prvo) | Cijena: najniža | Cijena: najviša.
- **Tehnički:** Čita/piše `sort` u URL; backend već podržava `price_asc`, `price_desc`.
- **Status:** Završeno.

---

## Cjelina 2: WhatsApp / Viber dugme na stranici oglasa ✅
- **Šta:** Na stranici oglasa (AdDetail) dugmad "Kontaktiraj na WhatsApp" i "Pošalji na Viber".
- **Tehnički:** Link `https://wa.me/382...?text=...` (prefilled tekst s linkom oglasa), viber://chat?number=...
- **Status:** Završeno (već postojalo; dodan prefilled tekst za WhatsApp i usklađen stil).

---

## Cjelina 3: Slični oglasi na stranici oglasa ✅
- **Šta:** Sekcija "Slični oglasi" na dnu stranice oglasa – ista kategorija/podkategorija, sličan raspon cijene.
- **Tehnički:** GET `/ads/similar/:slug`; prikaz do 8 kartica. Završeno.

---

## Cjelina 4: Uključiti chat ✅
- **Šta:** `SHOW_CHAT = true`, prikaz linkova "Poruke" u headeru i na oglasu (Poruka prodavcu).
- **Tehnički:** Provjera Socket/backend; eventualno male popravke.

---

## Cjelina 5: Saved search + notifikacije ✅
- **Šta:** "Spremi pretragu" za prijavljene korisnike; in-app notifikacija kada novi oglas odgovara spremljenoj pretrazi.
- **Tehnički:** Prisma model SavedSearch; API GET/POST/DELETE `/api/saved-searches`; u marketplaceu dugme "Spremi pretragu" (modal); stranica "Moje spremljene pretrage"; pri odobravanju oglasa (AKTIVAN) poziv `notifySavedSearchesForAd(adId)` – obavijest tipa SAVED_SEARCH_MATCH.
- **Napomena:** Pokreni `npx prisma migrate dev` (ili `prisma generate` + migraciju) da se kreira tabela SavedSearch.

---

## Cjelina 6 (opciono): Mapa, recenzije, statistike, bump, PWA
- Nakon 1–5, prema prioritetu iz UPOREDBA-SAJTOVA-OGLASI-I-PRIJEDLOZI.md.
