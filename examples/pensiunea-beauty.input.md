# Example input — Pensiunea Beauty (Cicir, Arad)

A worked example of the `INPUT` block from `SKILL.md`, filled in for a real Romanian
pension. To actually build the site you would **attach the property's photos** to the
chat, paste `SKILL.md`, and paste the filled block below.

Items marked `« … »` are placeholders — replace them with the real values (reservation
URL, map link, hosted photo URLs, real reviews, legal details) before running.

```
### Property
- Name: Pensiunea Beauty
- Tagline / one-liner: Pensiune cu piscină, restaurant și grădină, în satul Cicir, județul Arad.
- Logo text (mark the accent word): Pensiunea *Beauty*   (accent word: Beauty)
- Language (default: Română): Română
- Type (pension / hotel / villa / B&B / cabana): pensiune 3*

### Location & contact
- Village / city / county: Cicir, jud. Arad
- Full address: Str. Sergiu Celibidache nr. 65, Cicir, jud. Arad
- Phone (as displayed): 0756 669 207
- WhatsApp number (international, digits only, e.g. 40756669207): 40756669207
- Reservation URL (Booking.com or other): « link Booking.com al pensiunii »
- Google Maps link: « link Google Maps al locației »

### Rooms / pricing  (one line per room type: name | price/night | short description)
- 1 persoană | 160 lei/noapte | Cameră cu pat dublu, pentru o persoană.
- 2 persoane | 190 lei/noapte | Cameră cu pat dublu, pentru două persoane.
- Apartament | 290 lei/noapte | Pat matrimonial și pat de o persoană, pentru familii.

### Amenities / commodities  (list all)
- Climatizare (aer condiționat propriu în fiecare cameră)
- TV cu satelit, ecran plat, în fiecare cameră
- Bucătărie comună, mare, la dispoziția oaspeților
- Baie proprie (articole de toaletă gratuite, duș, uscător de păr)
- Lenjerie de pat și prosoape incluse
- WiFi gratuit în toată proprietatea
- Parcare privată, la locație
- Animale de companie acceptate
- Grădină amenajată
- Terasă acoperită
- Bar propriu (răcoritoare și băuturi)
- Mic dejun continental — 30 lei/persoană

### Signature feature  (the thing that makes this place special)
- Piscină cu hidroliză, fără clor — pretabilă și pentru copii; vara se organizează cursuri de înot la piscina pensiunii.

### Food / restaurant  (description + any prices) — skip if none
- Restaurant propriu cu sală de mese generoasă. Se prepară minuturi la comandă (grătar, cașcaval pane și altele). Dimineața este disponibil un mic dejun continental (30 lei/persoană). Sala primește oaspeții pensiunii și grupuri mai mari.

### Nearby attractions  (one line each: name | distance | short description)
- Ferma Zooland Sâmbăteni | 4 km (~5 min cu mașina) | Animale și păsări exotice, loc de joacă și o mică tiroliană, ideală pentru familiile cu copii.
- Lacul Ghioroc | 12–15 km (~15 min cu mașina) | „Litoralul Vestului": plajă cu nisip, palmieri, terase și locuri amenajate pentru înot.
- Mănăstirea Maria Radna | ~20 km (~18 min cu mașina) | Cel mai important loc de pelerinaj catolic din vestul României, la Lipova, recent restaurată.
- Parcul Natural Lunca Mureșului | ~25 km | Trasee de biciclete prin pădure și canoe de închiriat, direct pe râul Mureș.

### Photos  (attach the images to the chat AND list URLs here, grouped)
- Hero / building: « URL-uri fațadă: pensiunea, scări, curte pavată »
- Rooms: « URL-uri camere: pat dublu, mansardă, apartament, baie »
- Signature / pool: « URL-uri piscină + vedere aeriană »
- Restaurant / food: « URL-uri sală de mese, bucătărie »
- Outdoor / garden / terrace: « URL-uri terasă, grădină, vedere aeriană »
- Attractions: « URL-uri fermă, lac, mănăstire, parc »

### Reviews / testimonials  (paste a few real guest reviews)
- « Lipește aici 2–4 recenzii reale de pe Booking / Google (nume + text). »

### Optional brand hints  (leave blank to let the photos decide)
- Colours to prefer / avoid: — (lasă gol; culorile vin din poze)
- Vibe words: primitor, familial, liniștit, aer curat

### Legal / footer
- ANPC footer (RO)? yes / no: yes
- Company legal name + registration (for "Informații legale"): « denumire firmă + CUI »
- Privacy policy URL (or "generate a basic one"): generate a basic one
- "Site realizat de" credit: Alex Web Design
```

## What the builder should produce from this

- **Analyst read:** warm, terracotta-roofed rustic pension; pavers and greenery; warm
  golden light; families. *"Feels like a sunny country home with a garden and a pool."*
- **A palette derived from the photos** — a warm off-white base, a deep garden-green
  anchor for dark sections, and a terracotta/brick accent taken from the roof and
  paving — **without** using the banned literal `#F4F1EA` / `#D97757` values.
- **A characterful serif** for headlines (e.g. Fraunces/Cormorant) with a calm body
  face — not Inter.
- All sections from `SKILL.md` §8, in Romanian, with the ANPC footer.
