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

## Auto-gather from a Maps link or website (optional)

Instead of filling the form by hand, the `intake/` script can pull most of it for you —
facts, reviews and photos — from a Google Maps link, a place name, or the property's own
website.

```bash
# set whichever keys you have (see intake/.env.example)
export GOOGLE_MAPS_API_KEY=...   # Google Places API (New): facts, <=5 reviews, some photos
export FIRECRAWL_API_KEY=...     # Firecrawl: the property's own site / Booking / Facebook

node intake/gather.mjs "Pensiunea Beauty, Cicir, Arad" --website https://pensiuneabeauty.ro
```

It writes `intake-output/<slug>/` with a `photos/` folder, a pre-filled `INPUT.md`, and
(when a site is scraped) a `site-content.md` to mine for rooms, amenities and
attractions. Then attach the photos, paste `SKILL.md`, and paste the `INPUT.md`.

Which source does what:

- **Firecrawl** — best for the property's **own website / Booking / Facebook** page. It
  renders JavaScript and gets past anti-bot walls, returning clean text + real photo URLs.
- **Google Places API** — for a bare **Maps pin**: address, phone, hours, rating, up to
  **5 reviews**, and a handful of photos.
- Use whichever key you have; use both for the fullest picture. Each is optional.

**Honest limits.** A plain chat you paste into can't browse — auto-gather runs via this
script (or a tool-enabled agent like Claude Code). Google returns only ~5 reviews and a
few photos, and we deliberately **do not scrape Google Maps** itself (against Google's
terms, and unreliable). For the theme to work the AI must still *see* the photos, so the
script downloads them for you to attach.

## What you get

A self-contained **multi-file static site** — `index.html` + `styles.css` +
`main.js` — mobile-first, no build step, no libraries (Google Fonts only). Deploy it
on any static host (Netlify, Vercel, GitHub Pages, cPanel, …).

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
