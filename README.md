# 🎮 Quiz Offline (tip Kahoot)

Aplicație web de tip **Kahoot** care rulează **100% offline**, direct de pe un telefon Android, prin **hotspot Wi-Fi**. Fără internet, fără date mobile — perfectă pentru o clasă.

- **Host-ul** (profesorul) rulează serverul pe telefonul lui, în **Termux** (Node.js).
- Telefonul host pornește **hotspot-ul Wi-Fi**.
- **Elevii** se conectează la hotspot și deschid aplicația în browser folosind IP-ul local (ex. `192.168.43.1:5000`) — sau scanează **codul QR**.
- Totul se sincronizează în timp real prin **Socket.io** (WebSockets).

Suportă **30–50 de jucători** simultan, imagini/GIF-uri la întrebări, cronometru, scor pe viteză, clasament după fiecare rundă și podium final.

---

## 📋 Funcționalități

| Zonă | Ce poți face |
|------|--------------|
| **Ecran principal** | Host Game / Join Game |
| **Host** | Creezi joc, adaugi întrebări + răspunsuri, setezi timpul/întrebare, adaugi imagini/GIF, primești un **PIN unic**, poți Start / Pauză / Sari peste / Termină |
| **Player** | Introduce PIN + nume, intră în lobby, așteaptă startul |
| **Gameplay** | Întrebări simultane, cronometru, răspunsuri instant, puncte pentru corect + rapiditate, **clasament** după fiecare rundă |
| **Final** | **Podium Top 3** + statistici complete per jucător |
| **Extra** | Cod QR de conectare, reconnect automat, salvare quiz local (localStorage), quiz demo |

---

## 🚀 TUTORIAL COMPLET — Instalare pe telefonul HOST

> Trebuie făcut **o singură dată**. `npm install` are nevoie de internet **doar la prima instalare** (ca să descarce Node.js și dependențele). După aceea, jocul merge complet offline.

### Pasul 1 — Instalează Termux

Termux este un terminal Linux pentru Android.

1. Instalează **Termux** din [F-Droid](https://f-droid.org/en/packages/com.termux/) (recomandat) sau din GitHub Releases.
   > ⚠️ NU folosi versiunea veche din Google Play — e învechită și dă erori.
2. Deschide Termux.

### Pasul 2 — Instalează Node.js și git

În Termux, scrie pe rând (ai nevoie de internet aici — Wi-Fi normal sau date):

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs git
```

Verifică:

```bash
node -v
```

Dacă apare o versiune (ex. `v20.x`), e perfect.

### Pasul 3 — Adu proiectul pe telefon

**Varianta A — cu git (recomandat):**

```bash
git clone https://github.com/tim077077/kahoot-ofline.git
cd kahoot-ofline
```

**Varianta B — fără git:** copiază folderul proiectului pe telefon (ex. în `Download`), apoi dă-i acces Termux la stocare și intră în folder:

```bash
termux-setup-storage      # acceptă permisiunea care apare
cd ~/storage/downloads/kahoot-ofline
```

### Pasul 4 — Instalează dependențele (o singură dată, cu internet)

```bash
npm install
```

### Pasul 5 — Pornește serverul

```bash
npm start
```

sau, mai simplu, folosește helper-ul (instalează automat + ține telefonul treaz):

```bash
bash start.sh
```

Vei vedea în terminal ceva de genul:

```
  Kahoot Offline — server pornit
  Port: 5000
  Deschide în browser una dintre adresele:
    -> http://192.168.43.1:5000
```

✅ **Gata!** Serverul rulează. Lasă Termux deschis.

---

## 📶 Pasul 6 — Pornește hotspot-ul și conectează jucătorii

1. Pe telefonul host, deschide **Setări → Hotspot Wi-Fi** și pornește-l.
   > Nu ai nevoie de internet pe hotspot — doar rețeaua locală.
2. Elevii se conectează la acest hotspot de pe telefoanele lor (Wi-Fi normal, ca la orice rețea).
3. **Host-ul** deschide în browser (Chrome pe același telefon):
   ```
   http://localhost:5000/host
   ```
4. Host-ul apasă **„Creează joc"**, adaugă întrebările și obține **PIN-ul** + **codul QR**.
5. **Elevii** deschid browserul și accesează adresa afișată de server, de ex.:
   ```
   http://192.168.43.1:5000
   ```
   apoi apasă **„Intră în joc"**, sau **scanează codul QR** de pe ecranul host-ului (îi duce direct la pagina de intrare).
6. Elevul introduce **PIN-ul** + **numele** → intră în lobby.
7. Când toți sunt în lobby, host-ul apasă **▶️ Începe jocul**.

> 💡 **IP-ul hotspot-ului Android** este de obicei `192.168.43.1`, dar poate diferi. Uită-te mereu la adresa afișată în Termux la pornirea serverului — aceea e cea corectă.

---

## 🎯 Cum se joacă

**Host (telefonul cu serverul):**
- Creează jocul în editor → `Creează joc & obține PIN`.
- În lobby vezi PIN-ul, codul QR și jucătorii pe măsură ce intră.
- `Începe jocul` → fiecare întrebare apare pe ecranul host (ca „ecranul mare") și pe telefoanele elevilor.
- În timpul întrebării poți: **Pauză**, **Sari peste timp**, **Termină**.
- După fiecare întrebare vezi distribuția răspunsurilor + clasamentul → `Următoarea`.
- La final: **podium Top 3** + statistici.

**Player (elevii):**
- Deschid adresa → `Intră în joc` → PIN + nume.
- Așteaptă în lobby.
- Apasă butonul colorat cu răspunsul corect cât mai repede (mai repede = mai multe puncte).
- Văd dacă au răspuns corect, punctele și locul lor după fiecare rundă.

---

## 💡 Sfaturi pentru clasă (30–50 elevi)

- **Ține telefonul treaz:** ecranul host-ului nu trebuie să adoarmă. `start.sh` activează `termux-wake-lock` dacă ai instalat pachetul `termux-api` (`pkg install termux-api`). Alternativ, setează „Stay awake" în Opțiuni dezvoltator.
- **Baterie:** hotspot + server consumă. Ține host-ul la încărcare.
- **Imagini:** folosește imagini mici (sub ~1–2 MB). Ele se trimit către toate telefoanele, deci imaginile uriașe încetinesc jocul.
- **Reconnect:** dacă unui elev i se stinge ecranul sau pierde conexiunea, aplicația reintră automat în joc cu scorul păstrat (atâta timp cât folosește același nume).
- **Pregătește quiz-ul dinainte:** în editor apasă `💾 Salvează local` — quiz-ul rămâne salvat pe telefonul host și îl încarci data viitoare cu `📂 Încarcă salvat`.

---

## 🛠️ Depanare

| Problemă | Soluție |
|----------|---------|
| Elevii nu pot deschide adresa | Verifică că sunt conectați la **hotspot-ul host-ului**, nu la altă rețea. Folosește exact IP-ul afișat în Termux. |
| „PIN incorect" | PIN-ul se schimbă la fiecare joc nou. Cere host-ului PIN-ul curent de pe ecran. |
| Adresa `192.168.43.1` nu merge | Unele telefoane folosesc alt IP de hotspot. Uită-te la adresa din Termux la pornire, sau accesează `http://<ip>:5000/api/info`. |
| Serverul se oprește când închizi ecranul | Instalează `pkg install termux-api` și pornește cu `bash start.sh` (wake-lock). |
| „address already in use" | Portul 5000 e ocupat. Pornește pe alt port: `PORT=5050 npm start`. |
| Imaginea nu se încarcă | Trebuie să fie sub 3 MB și format imagine (jpg/png/gif). |

---

## 📁 Structura proiectului

```
kahoot-ofline/
├── server.js               # Punct de intrare: Express + Socket.io
├── src/
│   ├── game.js             # Clasa Game: stare, scor, cronometru
│   ├── gameManager.js      # Gestionează jocurile + generează PIN-uri
│   └── socketHandlers.js   # Evenimentele Socket.io (host/player)
├── public/                 # Frontend (servit static)
│   ├── index.html          # Ecran principal (Host / Join)
│   ├── host.html           # Editor + lobby + prezentare + control
│   ├── play.html           # Interfața jucătorului
│   ├── css/style.css       # Stil modern inspirat de Kahoot
│   └── js/
│       ├── host.js
│       ├── play.js
│       └── vendor/qrcode.js # Generator QR offline (fără CDN)
├── start.sh                # Helper de pornire pentru Termux
├── package.json
└── README.md
```

### Cum extinzi

- **Alt tip de întrebare (ex. adevărat/fals):** editorul acceptă 2–6 răspunsuri; logica de scor e în `src/game.js` (`submitAnswer`).
- **Formula de punctaj:** modifică `MAX_POINTS` / `MIN_CORRECT_POINTS` și bonusul de streak în `src/game.js`.
- **Timp/limită jucători:** `src/gameManager.js` (validări) și limita `>= 60` din `src/socketHandlers.js`.
- **Design:** totul e în `public/css/style.css` (culorile Kahoot sunt variabile CSS la început).

---

## ⚙️ Cerințe tehnice

- Frontend: HTML + CSS + JavaScript (fără framework, ușor de citit).
- Backend: Node.js + Express.
- Timp real: Socket.io (WebSockets).
- Rulare: `node >= 16`.
- Funcționează integral pe LAN / hotspot Android, fără internet la runtime.

## Licență

MIT.
