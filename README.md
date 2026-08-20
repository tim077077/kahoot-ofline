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
