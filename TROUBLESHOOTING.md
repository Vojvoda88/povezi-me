# Rješavanje problema – Povezi.ME

## 1. `EADDRINUSE: address already in use 0.0.0.0:3000` (ili 3001)

**Dev backend sada koristi port 3001** (`npm run dev`), što izbjegava sukob s procesima na 3000. Ako i dalje dobijaš EADDRINUSE:

### Windows (PowerShell / CMD)
```powershell
# Pronađi PID procesa na portu 3000
netstat -ano | findstr :3000

# Pronađi PID na portu 3001
netstat -ano | findstr :3001

# Pronađi PID na portu 5173 (Vite)
netstat -ano | findstr :5173

# Ubij proces (zamijeni 12345 sa stvarnim PID-om iz prethodnog ispisa)
taskkill /PID 12345 /F
```

### Brži način (Windows PowerShell)
```powershell
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

Zatim ponovo pokreni `npm run dev`.

---

## 2. `The column j1.shadowBanned does not exist` / `The table AdViewThrottle does not exist`

Baza nije usklađena sa Prisma shemom. Primijeni migracije:

```bash
npx prisma migrate deploy
```

Ako dobiješ grešku o konekciji, provjeri `DATABASE_URL` u `.env`.

---

## 3. Port 5173 također zauzet

Frontend će automatski pokušati 5174, 5175... Ali ako koristiš proxy, obavezno otvori app na portu koji Vite pokazuje (npr. `http://localhost:5174`).

---

## 4. Pred prekidanjem `npm run dev`

1. Pritisni `Ctrl+C` u terminalu
2. Pričekaj da oba procesa (backend + frontend) budu zaustavljena
3. Ako i dalje dobijaš EADDRINUSE, koristi korake iz točke 1
