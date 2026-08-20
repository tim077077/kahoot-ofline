# Hotel Website One-Shot

A single, self-contained prompt that turns a lodging property's **photos, reviews,
description and amenities** into a complete, bespoke website — in one shot. The visual
theme (colours, fonts, mood) is **derived from the actual photos**, so every site
looks like the place it's for, not like a generic AI template.

## What's in here

- **[`SKILL.md`](./SKILL.md)** — the whole thing. One self-contained block: role,
  anti-slop method, the five-step process, the required sections, the technical spec,
  and the input form at the bottom. Paste it, or install it as a skill.
- **[`examples/pensiunea-beauty.input.md`](./examples/pensiunea-beauty.input.md)** — a
  filled-in input form (a real Arad pension) as a worked example.
- **[`intake/`](./intake/)** — an optional Node script (`gather.mjs`) that auto-fills the
  input form and downloads the photos from a Google Maps link or a website. See below.

## How to use it

You need a **vision-capable AI** (e.g. Claude) — it has to *see* the photos to pick
the theme.

### A) Paste it (works anywhere)

1. Open a chat with a vision-capable model.
2. **Attach all of the property's photos.**
3. Paste the entire contents of `SKILL.md`.
4. Fill in the `INPUT` section at the bottom with the property's details
   (see the example for how a filled form looks).
5. Send. You get `index.html`, `styles.css`, `main.js` and a short design rationale.

### B) As a Claude Code skill

Drop the file at `~/.claude/skills/hotel-website-oneshot/SKILL.md` (or your project's
`.claude/skills/`). Then attach the photos, fill the `INPUT`, and ask it to build the
site.

## Auto-gather from a Maps link (optional)

Most small pensions have **no website** — they live on Google, Booking and Facebook.
Give the intake script a **Google Maps link** (or just a name) and, with a Firecrawl
key, it **finds the Booking and Facebook pages itself** and pulls facts + photos.

```bash
# set whichever keys you have (see intake/.env.example)
export GOOGLE_MAPS_API_KEY=...   # Google Places (New): facts + (with billing) reviews & photos
export FIRECRAWL_API_KEY=...     # Firecrawl: search + Booking scraping + screenshots

node intake/gather.mjs "https://maps.app.goo.gl/…"      # a Maps link, or…
node intake/gather.mjs "Pensiunea Flora, Cicir, Arad"   # …just the name
```

It writes `intake-output/<slug>/`:

- `photos/` — real photos (mainly from Booking) **plus a full-page screenshot of each
  source**, so the AI can *see* the property even when a photo download is blocked;
- `INPUT.md` — pre-filled form (name, address, phone, WhatsApp, Booking + Facebook URLs);
- `site-content.md` — scraped text to mine for rooms / amenities;
- `photo-urls.txt` — every image URL, to bulk-download on your own machine if a CDN
  blocked the server (`cd photos && xargs -n1 curl -sLO < ../photo-urls.txt`).

Then attach `photos/`, paste `SKILL.md`, and paste `INPUT.md`.

Which source does what:

- **Booking** (via Firecrawl `proxy:"auto"`) — the **best photo source**, auto-found
  from the name; real, high-res images.
- **Google Places** — address, phone, hours, rating; **reviews + photos need billing**
  enabled on your Google key (a demo key returns facts only).
- **Facebook** — auto-found, but **Firecrawl refuses to scrape Facebook**, so use its
  page for reference or a dedicated FB scraper.

**Honest limits.** A plain chat you paste into can't browse — auto-gather runs via this
script (or a tool-enabled agent). We deliberately **don't scrape Google Maps** itself
(against Google's terms). The reliable backbone is still the **owner's own photos** —
this tool bootstraps a strong first pass; the owner has the best 15 shots on their phone.

## What you get

A self-contained **multi-file static site** — `index.html` + `styles.css` + `main.js`,
**plus the mandatory Romanian legal pages** (`politica-confidentialitate.html`,
`politica-cookies.html`, `termeni-si-conditii.html`) and a **cookie-consent banner**
(GDPR + Legea 506/2004). Mobile-first, no build step, no libraries (Google Fonts only).
Deploy it on any static host (Netlify, Vercel, GitHub Pages, cPanel, …).

## Why it doesn't look AI-generated

The prompt bakes in an anti-"slop" method drawn from Anthropic's own frontend-design
guidance:

- it **derives** the palette and typography from your photos (nothing is picked at
  random or by habit);
- it runs an **adversarial self-critique** against the known AI design clichés — the
  cream-and-terracotta look, the near-black-with-acid-accent look, the broadsheet
  look — and rejects them unless the photos genuinely earn them;
- it **bans the default fonts, colours and gradients** (Inter, purple/teal gradients,
  pure black/white, emoji icons, and so on).

Romanian copy + ANPC compliance footer by default — both configurable per client.
