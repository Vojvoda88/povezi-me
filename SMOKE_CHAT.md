# Chat smoke test checklist

1. **Otvori chat → prvi razgovor se izabere → poruke se učitaju bez "Prekinuto"**
   - Prijavi se, idi na /poruke
   - Ako imaš razgovore, prvi se auto-izabere
   - Poruke se učitaju bez prikaza "Prekinuto" (AbortError se ignorira)

2. **StrictMode dev: nema lažnih grešaka**
   - Pokreni frontend u dev (`npm run dev`)
   - Otvori chat, učitaj poruke
   - Ne bi trebalo da se pojavi "Prekinuto" ni drugi lažni error

3. **Pošalji poruku → vidi se odmah + stiže newMessage drugom korisniku**
   - Korisnik A šalje poruku
   - Poruka se odmah pojavi u chatu (optimistički iz response-a)
   - Korisnik B vidi novu poruku preko socket newMessage eventa

4. **Refresh stranice → razgovori i poruke ostaju (iz DB)**
   - Nakon refresh-a, poruke se ponovo učitaju sa servera
   - Razgovori i sadržaj ostaju

5. **Token istekao → socket connect_error jasno vidljiv + UI pokaže auth error**
   - Obriši token ili postavi istečen
   - Pri 401/403 API vrati "Morate biti prijavljeni"
   - Sa VITE_DEBUG_CHAT=true u konzoli vidiš connect_error

## Debug flagovi

- **Frontend:** `VITE_DEBUG_CHAT=true` – log socket eventa (connect, connect_error, disconnect, reconnect_attempt)
- **Backend:** `DEBUG_CHAT=true` – log connect (userId, socket.id), join room, emit newMessage
