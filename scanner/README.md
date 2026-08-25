# Cadru Scanner

A small local web app: pick a Romanian county, it finds every accommodation, flags the
ones **without a real website** (Facebook-as-website counts as none), extracts each
prospect's **real photos**, and generates a **demo-site preview** from those photos with
OpenAI. Built for the studio's own lead generation.

```
County ──▶ enumerate ──▶ classify (no real site?) ──▶ extract photos ──▶ generate demo
          (Overpass)      (deterministic)            (Firecrawl)         (OpenAI vision)
```

---

## Best tool for each step (and why)

| Step | Tool used here | Why it is the best fit |
|---|---|---|
| **1. Enumerate a whole county** | **OpenStreetMap Overpass API** (free, no key) | Queries the county's admin boundary directly and returns name + website tag + phone + coordinates for every `tourism=*` place. Google Places (New) hard-caps at **60 results per query** (20/page × 3 pages), so a full county needs grid-tiling; Apify/Outscraper bypass the cap but cost money. Overpass is the best free "whole county" source. |
| **2. Detect "no real website"** | Deterministic classifier | The website field is all you need: empty, or pointing at facebook / instagram / linktr.ee / an OTA (Booking, Travelminit) = **no real site** = a prospect. No API, no cost, no guessing. |
| **3. Extract the property's photos** | **Firecrawl** (`/search` + `/scrape`) | The strongest 2025 image extractor: it runs JS, triggers lazy-loading, resolves `srcset`/CDN variants, and returns a full-page **screenshot** as a fallback when a CDN blocks the images. It finds the property's Booking/Travelminit page (the richest real-photo source) even when the place only has a Facebook page. **Not** Google Places Photos: Google's terms forbid caching/storing them and require live display with attribution, so they cannot be reused to build a site. |
| **4. Generate the demo from the photos** | **OpenAI vision** (`/v1/chat/completions`, `gpt-4o` by default) | A vision model reads the real photos, derives the palette/type/mood, and writes a self-contained `index.html`. The prompt carries the studio's anti-slop + **anti-template** rules so each demo has a different structure, not the same wireframe in new colours. |

Minimum keys to run the whole pipeline: **OpenAI + Firecrawl** (enumeration is free).

---

## Run it

Requires **Node.js 20+**.

```bash
cd scanner
npm install
npm start
# open http://127.0.0.1:5173
```

Then in the UI:
1. Open **Chei API**, paste your **OpenAI** key and **Firecrawl** key (they save in your
   browser's `localStorage` only). Optionally set the model (default `gpt-4o`).
2. Pick a **județ**, keep or narrow the accommodation types, click **Scanează**.
3. The table lists every place, best prospects first, with a website-status badge.
4. Click **Generează** on any prospect (or **Generează demo pentru toți candidații**).
   It finds the photos, builds the site, and gives you a **Deschide demo ↗** link.

### Where to get the keys
- **OpenAI:** platform.openai.com → API keys. Any vision model works; set it in the Model box.
- **Firecrawl:** firecrawl.dev → dashboard → API key (has a free tier).
- **Google Places (optional):** Google Cloud console → enable *Places API (New)* → create a key. Only needed if you switch the Sursă to Google Places.

---

## Roughly what it costs
- **Enumeration:** free (Overpass) or Google Places billing if you use that source.
- **Images:** one Firecrawl search + one scrape per prospect (a handful of credits each).
- **Generation:** one OpenAI vision call per demo. Cost depends on the model and how many
  photos you send (this app caps at 6 images per site). `gpt-4o` is inexpensive per site;
  bigger models cost more. Generate for candidates you actually want, not the whole county
  blindly.

---

## Legal and etiquette (read this)
- **Google Maps is not scraped.** Enumeration uses OSM/Overpass and the official Places
  API only. Do not point this at a Google Maps scraper that violates Google's terms.
- **Google Places photos are off-limits for building.** Their terms forbid storing/reusing
  them. That is why images come from the property's own Booking/Facebook presence instead.
- **The photos belong to the business.** A demo built from a property's own photos, shown
  privately to that owner as "here is what we would build for you", is reasonable outreach.
  Do **not** publicly deploy a site with someone's photos without their consent and their
  real photos. The generated footer marks the site as `demonstrativ`.
- **Outreach has rules.** No automated WhatsApp/SMS blasting (WhatsApp ToS + Legea
  506/2004 consent). Personalised, low-volume, opt-out-respecting contact only. See the
  studio `AGENTS.md` Part 9.
- **Be polite to the free APIs.** Overpass is a shared free service: scan a county at a
  time, not in a tight loop. The app runs generations sequentially for the same reason.

---

## How each step works (for editing)
- `lib/enumerate.mjs` - Overpass QL against `admin_level=4` (county) for `tourism=*`; a
  Google Places (New) `searchText` provider is included and clearly flagged as 60-capped.
- `lib/classify.mjs` - website-status rules; `SOCIAL_HOSTS` is the list that counts as
  "no real site". Add/adjust hosts there.
- `lib/images.mjs` - Firecrawl discovery + scrape + `<img>` extraction with a `score()`
  that prefers real photo CDNs. Change `FIRECRAWL_BASE` for v2.
- `lib/generate.mjs` - the OpenAI call and the embedded house prompt (anti-slop +
  anti-template + RO/ANPC + cookie banner + output format). Swap the provider here if you
  ever change your mind.
- `server.mjs` - two endpoints: `/api/scan` (steps 1-2) and `/api/generate` (steps 3-4).
- `public/` - the UI.
- `output/` - generated demos, served at `/demos/...` (gitignored).

### Getting closer to "ALL" of a county
Overpass is only as complete as OpenStreetMap. For fuller coverage, add an **Apify** or
**Outscraper** Google-Maps-scraper provider in `enumerate.mjs` (they bypass the 60/120
limits and also return email + photo URLs), or grid-tile the Places `searchText` query
across the county and dedupe by place id.

---

## Sources
- [Google Places Text Search (New) - limits](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Google Places API policies (photo caching/attribution)](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Overpass API by example](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example)
- [Firecrawl scrape docs](https://docs.firecrawl.dev/features/scrape)
- [Best Google Maps scrapers 2026 (Apify/Outscraper)](https://blog.apify.com/best-google-maps-scrapers/)
