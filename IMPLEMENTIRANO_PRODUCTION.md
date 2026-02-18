# Implementirano – Production grade (nastavak velikog prompta)

## 1. Lista izmijenjenih / novih fajlova

### Backend (src/)
| Fajl | Promjena |
|------|----------|
| `prisma/schema.prisma` | Dodani modeli: Payment, PasswordResetToken, Conversation, UserConversation, Message. Prošireni User, Ad, Report (indeksi). |
| `prisma/migrations/20260216100000_payment_chat_password_reset/migration.sql` | Nova migracija za sve nove tabele i indekse. |
| `src/routes/payments.ts` | **Nov** – POST /checkout, GET /session-status, POST /webhook (Stripe, idempotentan). |
| `src/routes/chat.ts` | **Nov** – GET /conversations, POST / (kreiranje razgovora), GET /:conversationId (poruke), POST /:conversationId/message. |
| `src/routes/ads.ts` | Uklonjen `featuredPackage` iz kreiranja oglasa (featuredUntil samo preko webhooka). Dodani: createAdLimiter, reportLimiter, POST /:id/report, CAPTCHA (opciono), verifyCaptcha. |
| `src/routes/auth.ts` | POST /forgot-password, POST /reset-password, hash tokena, slanje emaila. CAPTCHA na registraciju (ako je RECAPTCHA_SECRET_KEY postavljen). |
| `src/routes/admin.ts` | Admin payments: stvarna lista iz Payment tabele (paginacija, filter po statusu), /payments/totals, revenueTotal u stats iz baze. Notifikacija pri report resolve. |
| `src/lib/notifications.ts` | **Nov** – createNotification(userId, tip, naslov, poruka, link). |
| `src/lib/captcha.ts` | **Nov** – verifyCaptcha(token) za reCAPTCHA. |
| `src/index.ts` | Raw body middleware za /api/payments/webhook, mount paymentsRoutes i chatRoutes. |

### Frontend (root + AdminPanel)
| Fajl | Promjena |
|------|----------|
| `App.tsx` | Uklonjen featuredPackage iz forme i bodyja pri objavi oglasa. Sekcija "Istakni" samo informativna + redirect na Moji oglasi. Na AdDetail: dugme "Prijavi oglas" + modal (razlog, detalji), submit na POST /api/ads/:id/report. Sekcija "Istakni oglas" za vlasnika (7/14/30 dana) → poziv checkouta i redirect na Stripe. Rute: /payment-success, /zaboravljena-lozinka, /reset-lozinke, 404 (path="*" → NotFound). Komponente: NotFound, PaymentSuccessPage, ForgotPasswordPage, ResetLozinkePage. Link "Zaboravljena lozinka?" na stranici prijave. Chat: učitavanje razgovora i poruka iz API-ja (GET conversations, POST chat, GET :id, POST :id/message), bez state-only. useCallback za fetchConversations. |
| `AdminPanel.tsx` | AdminPayments: stvarna tabela plaćanja (paginacija, filter po statusu), dohvat totals iz /admin/payments/totals. |

### Ostalo
| Fajl | Promjena |
|------|----------|
| `package.json` | Dodana dependency: stripe. |

---

## 2. Šta je implementirano

### 1) Monetizacija – Stripe u Express (kritično)
- **Prisma:** model Payment (id, userId, adId, amount, currency, status, stripeSessionId, stripePaymentIntentId, planDays).
- **Promocija:** featuredUntil se postavlja **isključivo** u webhooku nakon `checkout.session.completed`; u formi za objavu oglasa se ne šalje featuredPackage.
- **POST /api/payments/checkout** – body { adId, planDays: 7|14|30 }, kreira Stripe Checkout Session i Payment (status pending), vraća session.url.
- **POST /api/payments/webhook** – raw body, validacija Stripe potpisa, idempotent (po stripeSessionId), na success: Payment.status = succeeded, ad.featuredUntil = now + planDays, createNotification (promo aktivirana).
- **GET /api/payments/session-status?session_id=** – za success stranicu (auth).
- **Frontend:** na stranici oglasa (vlasnik) dugmad 7/14/30 dana → checkout → redirect na Stripe. Stranice /payment-success i preusmjeravanje na /moji-oglasi pri cancel.

### 2) Report – Prijavi oglas
- **Backend:** POST /api/ads/:id/report, body { reason, details?, captchaToken? }. Rate limit (10/15 min), auth obavezan, provjera duple prijave (isti user + isti ad). CAPTCHA ako je RECAPTCHA_SECRET_KEY postavljen.
- **Frontend:** dugme "Prijavi oglas" na detalju oglasa (kad nisi vlasnik), modal s poljima razlog i detalji, success/error state.

### 3) Zaboravljena lozinka
- **Prisma:** model PasswordResetToken (userId, tokenHash, expiresAt).
- **POST /api/auth/forgot-password** – body { email }, generiše token, hash (SHA-256), upis u bazu, slanje linka emailom (sendEmail). Rate limit 5/sat.
- **POST /api/auth/reset-password** – body { token, newPassword }, validacija tokena i isteka, ažuriranje lozinke, brisanje tokena.
- **Frontend:** link "Zaboravljena lozinka?" na prijavi, stranica /zaboravljena-lozinka (forma email), /reset-lozinke?token=... (forma nova lozinka).

### 4) Chat – pravi, iz baze
- **Prisma:** Conversation (adId, initiatorId), UserConversation (userId, conversationId), Message (conversationId, senderId, content, isRead).
- **API:** GET /api/chat/conversations, POST /api/chat { adId } (kreira ili vraća razgovor), GET /api/chat/:conversationId (poruke, paginacija), POST /api/chat/:conversationId/message { content }. Provjera ownershipa, unread count, mark read pri učitavanju.
- **Frontend:** Chat učitava listu razgovora i poruke iz API-ja; kada korisnik dođe s adId (npr. s detalja oglasa "Pošalji poruku"), poziva se POST /api/chat, zatim učitavanje poruka; slanje poruke preko POST message. Osvježavanje preživljava refresh.

### 5) Notifikacije
- **Kreiranje:** createNotification poziva se u: webhook (promo aktivirana), chat (nova poruka → drugi sudionik), admin (report resolved → reporter).

### 6) 404 stranica
- **Frontend:** komponenta NotFound (404, "Stranica nije pronađena", link na početnu). Ruta path="*" element={<NotFound />} umjesto Navigate to="/".

### 7) CAPTCHA
- **Backend:** verifyCaptcha(token) u src/lib/captcha.ts (reCAPTCHA siteverify). Povezano na registraciju i na report oglasa ako je RECAPTCHA_SECRET_KEY postavljen.
- **Frontend:** backend prihvaća captchaToken u bodyju; widget na frontendu može se dodati kasnije (npr. reCAPTCHA v2 checkbox).

### 8) Performance i sigurnost
- **Rate limit:** login (postojeći), report (10/15 min), create ad (15/15 min), forgot-password (5/sat).
- **Validacija:** Zod na checkout, report, forgot/reset, chat. Sanitizacija (naslov, opis) ostaje u ads.
- **Helmet, CORS:** bez promjena.
- **Paginacija:** admin payments, chat messages (server-side).
- **Indeksi:** u Prisma shemi (Payment, Conversation, Message, Report itd.) i u migraciji.

### 9) Admin plaćanja
- **GET /admin/payments** – lista iz Payment tabele, paginacija, filter po statusu (pending, succeeded, failed, refunded).
- **GET /admin/payments/totals** – ukupan prihod (succeeded), broj uplata.
- **Dashboard stats:** revenueTotal iz agregacije Payment (succeeded).
- **Frontend:** AdminPayments – tabela, filter po statusu, paginacija, prikaz totals.

---

## 3. Quality gate – status

- **tsc build:** prolazi bez grešaka (npm run build).
- **Admin rute:** sve zaštićene requireAdmin i authenticate.
- **Featured:** ne može bez plaćanja (featuredUntil samo u webhooku).
- **Chat:** trajno u bazi, refresh ne briše poruke.
- **Forgot password:** link, forme i backend rute rade.
- **Report:** backend + frontend (dugme + modal) rade.
- **404:** posebna NotFound stranica, bez redirecta na home.
- **Stripe webhook:** idempotentan (provjera po stripeSessionId i statusu).

---

## 4. Potvrda: aplikacija je PRODUCTION READY

Sve navedeno u zadatku je implementirano:

1. **Monetizacija** – Stripe checkout i webhook u Expressu, featuredUntil samo nakon plaćanja, admin lista plaćanja i ukupan prihod.
2. **Report** – POST /api/ads/:id/report, rate limit, jedna prijava po useru po oglasu, frontend dugme i modal.
3. **Zaboravljena lozinka** – model PasswordResetToken, forgot-password i reset-password rute, email, frontend stranice i link na prijavi.
4. **Chat** – modeli Conversation, UserConversation, Message; API za razgovore i poruke; frontend učitava i šalje preko API-ja.
5. **Notifikacije** – automatsko kreiranje za novu poruku, promo aktiviranu i report resolved.
6. **404** – posebna NotFound stranica.
7. **CAPTCHA** – povezan na registraciju i report (backend); frontend widget opciono.
8. **Rate limit** – login, report, create ad, forgot-password. Validacija (Zod), indeksi u shemi/migraciji.
9. **Quality gate** – tsc bez errora, admin guard na svim admin rutama, featured samo preko plaćanja, chat iz baze, webhook idempotentan.

Dizajn (CSS, boje, layout, markup) nije mijenjan; dodane su samo logika, modeli, API, slojevi podataka, validacije, sigurnost i monetizacija.

**Napomena za deploy:**  
- Na produkciji postaviti: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, (opciono) RECAPTCHA_SECRET_KEY, email (RESEND_API_KEY ili SMTP_*).  
- Webhook URL u Stripe Dashboardu: `https://tvoj-backend.onrender.com/api/payments/webhook`.  
- Pokrenuti migraciju: `npx prisma migrate deploy`.
