# Hitno – šta je implementirano i kako proslijediti na Git

## Implementirane izmjene (već u fajlovima)

1. **Admin može pregledati oglas na čekanju ("Pogledaj")**
   - `src/middleware/auth.ts` – dodat `optionalAuthenticate` (opcionalna auth, nikad 401)
   - `src/routes/ads.ts` – GET `/ads/:slug` koristi `optionalAuthenticate`, admin vidi i NA_CEKANJU
   - `App.tsx` – pri učitavanju oglasa šalju se auth headeri (`getAuthHeaders()`)

2. **Obavještenja za admina** – već su bile u kodu (kad neko objavi oglas na čekanju, admin dobija notifikaciju u zvoncu, link na `/admin/pending`).

---

## Naredbe koje treba pokrenuti u svom terminalu (gdje imaš Git)

Otvori **PowerShell** ili **Command Prompt** u mapi projekta i uradi:

```bash
cd "c:\Users\Jovan\Desktop\Sve novo"

git add src/middleware/auth.ts src/routes/ads.ts App.tsx
git status
git commit -m "fix: admin može pregledati oglas na čekanju (Pogledaj); auth headeri pri učitavanju oglasa"
git push origin main
```

Ako koristiš drugu granu (npr. `master`), zamijeni `main` tom granom.

Nakon pusha, Render (backend) i Vercel (frontend) će automatski pokrenuti deploy ako su povezani na repo.
