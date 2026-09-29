# SlideDrop studio

A local tool that copies the **format** of any viral TikTok photo slideshow and makes one of your own.

1. **Copy a slideshow.** Screenshot 2–5 slides of a viral carousel and drop them in. Claude reads:
   - the look: text position, caption boxes, outline or shadow, font type, case, colours, photo or plain background
   - the writing formula: how the hook works, what each slide does, the tone, and how it ends

   The result is saved to your format library (in your browser).
2. **Write.** Type a topic, and optionally a product to feature (Merry Paws, Mobilat…). Claude writes new slides in that exact formula. It copies the format, never the content.
3. **Finish.** Add your own background photos, tweak the look, edit any slide on the big phone preview, then download 1080×1920 PNGs as a ZIP with the caption.

It also ships with 10 hand-curated formats ("things I wish I knew", "apps that feel illegal to know", POV, rankings, Notes-app confessions…).

## Run it

```bash
npm install
cp .env.example .env.local    # add ANTHROPIC_API_KEY
npm run dev                   # http://localhost:3000
```

Without a key it runs in demo mode with example output.

```bash
npm test          # specs, text wrapping, API routes (demo mode)
npm run lint
npm run typecheck
```

## How it's built

| Path | What it does |
|---|---|
| `src/lib/analyze.ts` | Screenshots → template spec (Claude vision, structured output) |
| `src/lib/writer.ts` | Spec + topic → slides, caption, hashtags |
| `src/lib/spec.ts` | The spec schema, the curated formats, and colour/number sanitising |
| `src/lib/render.ts` | Draws any spec on canvas: wrap and auto-shrink, caption boxes, outline, shadow, Notes chrome |
| `src/components/Studio.tsx` | The studio screen |
| `src/lib/posting.ts` | Posting adapter. Only a demo poster for now |

Both Claude calls use server-side refusal fallback (`fallbacks: "default"`).

## Posting to TikTok

"Send to TikTok drafts" is a demo that posts nothing. If this ever becomes a product, the real route is TikTok's official Content Posting API in draft mode (`MEDIA_UPLOAD`). It works without TikTok's audit, but needs a TikTok developer app (Login Kit, `video.upload`) and the slides hosted on a domain you've verified with TikTok. Never use unofficial or reverse-engineered posting.

## Notes

- Formats aren't copyrightable, but photos and exact text are. Copy the structure, use your own photos, and write your own words (that's what the writer does).
- Copied formats live in `localStorage`, so they're per browser. Export them if you switch machines.
