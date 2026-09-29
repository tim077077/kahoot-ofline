# SlideDrop

A web app for TikTok photo-carousel slideshows. You pick a proven viral format, type a topic (and optionally a product to feature), and Claude writes the hook and every slide. You then pick one of 4 looks, add background photos, and download ready-to-post 1080×1920 slides as a ZIP.

It's built to be sold, and to market the other apps: use the "Feature a product" field for Merry Paws or Mobilat.

## What's in it

- **Template library** (`src/lib/templates.ts`)
  - 10 formats that keep going viral (listicles, POV, rankings, Notes-app confessions, "apps that feel illegal to know"…), ranked by a hand-curated "heat" score.
  - **Curated by hand on purpose.** TikTok has no public "trending slideshows" API, and scraping TikTok breaks their terms.
  - Keeping this list fresh is your job and your edge: study what's blowing up each week, then add or re-rank formats and bump `LIBRARY_UPDATED`.
- **AI writer** (`src/lib/writer.ts`)
  - Calls Claude through the official SDK and returns typed JSON: slides, caption and hashtags.
  - Server-side fallback is on (`fallbacks: "default"`): if a safety classifier declines, the request is retried on Anthropic's recommended fallback model.
  - Without a key in dev it returns the format's example.
- **Renderer** (`src/lib/render.ts`)
  - Draws the slides on canvas in 4 looks: TikTok-style caption bubbles, bold outline, Notes app, minimal serif.
  - Text is word-wrapped and auto-shrunk to fit.
- **Posting** (`src/lib/posting.ts`)
  - Demo only for now: accepts the slides and reports that nothing was posted.
  - See "TikTok posting" below.
- **Pricing**
  - Free: 3 AI writes a day and a small watermark on the last slide.
  - Pro: $9/month, 200 AI writes a day, no watermark. It's a Stripe subscription; renewals extend Pro, and cancelled subscriptions run out.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

```bash
npm test          # templates, text wrapping, Stripe webhook (signed test events)
npm run lint
npm run typecheck
npm run build
```

## Deploy (Vercel)

1. Import the repo and set **Root Directory** to `slides`.
2. **Storage → Upstash Redis → Connect.**
3. Set `ANTHROPIC_API_KEY`.
4. Stripe:
   - Set `STRIPE_SECRET_KEY`.
   - Add a webhook to `https://YOUR_DOMAIN/api/webhook` with the events `checkout.session.completed` and `invoice.paid`.
   - Set its signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`.

## TikTok posting (the real one)

Use TikTok's **official Content Posting API in draft mode** (`MEDIA_UPLOAD`). The carousel lands in the creator's TikTok inbox; they add a trending sound and post. That mode works without TikTok's audit. Direct public posting needs the audit, and until then posts are private-only.

What it takes:

1. A TikTok developer app with Login Kit and the `video.upload` scope. The review needs a live site, a privacy policy and terms.
2. Hosting the rendered slides on a domain you've verified with TikTok (for example Vercel Blob behind your domain), because photo posts are pulled from URLs.
3. Implementing a `TikTokDraftPoster` next to `DemoPoster` in `src/lib/posting.ts`. The rest of the app already calls `sendToDrafts`.

Do not use unofficial or reverse-engineered posting. It gets users' accounts flagged and breaks whenever TikTok changes its app.

## Before launch

- [ ] Write 3 real slideshows with the key set, and check the hooks are actually good. Tune `SYSTEM` in `writer.ts` if they read like AI.
- [ ] Add a privacy policy and terms page (also needed for the TikTok app review).
- [ ] Pick a name and domain (`BRAND` in `src/lib/config.ts`).
