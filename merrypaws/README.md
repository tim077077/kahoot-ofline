# Merry Paws

Christmas portraits of your pet, as a web app. You upload a pet photo (and optionally one of yourself), pick one of 8 festive looks, and get a **free watermarked preview**. Paying unlocks the full-resolution image.

## Why this idea

[Pet Plus Us](https://trustmrr.com/startup/pet-plus-us) is a web app selling AI portraits of owners with their pets at $19 each. It was founded on September 6, 2026 and made $15.7k in its first ~3 weeks, $10.8k of that in the last 30 days (TrustMRR-verified, September 2026). This app takes the same proven mechanic and adds a Christmas angle, for the biggest gifting season of the year.

## How it works

1. **Preview** (`/api/preview`)
   - Generates the portrait with fal.ai.
   - Makes a small (≤640px) preview with a paw-print watermark using `sharp`.
   - Stores the full-size image URL server-side and returns only the preview. The full-resolution image never reaches the browser before payment.
2. **Unlock** (`/api/unlock`)
   - Spends 1 credit per portrait.
   - Unlocks each portrait only once, even with double clicks or webhook retries.
3. **Buy** (`/api/checkout` → Stripe → `/api/webhook`)
   - Packs of 1, 3 or 8 credits.
   - Buying from a preview unlocks that portrait automatically once the payment lands.
4. **Download** (`/api/download/[id]`)
   - Full resolution, only for unlocked portraits.

Free previews are capped at 3 per IP per day, plus a global daily cap (your worst-case AI bill). Buyers get 30 previews a day.

## Run locally

```bash
npm install
cp .env.example .env.local   # all optional locally
npm run dev
```

Without `FAL_KEY` you're in demo mode: the "portrait" is your own photo with the watermark, so you can click through the whole flow for free.

```bash
npm test          # credits, unlocking, webhook (signed test events), watermark, prompts
npm run lint
npm run typecheck
npm run build
```

## Deploy (Vercel)

1. Import the repo and set **Root Directory** to `merrypaws`.
2. **Storage → Upstash Redis → Connect.**
3. Set `FAL_KEY` and add about $10 of credit on fal.ai.
4. Stripe:
   - Set `STRIPE_SECRET_KEY`.
   - Add a webhook to `https://YOUR_DOMAIN/api/webhook` with the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   - Set its signing secret as `STRIPE_WEBHOOK_SECRET`.
5. Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`.
6. Connect Stripe to TrustMRR on day one.

## Before launch (in this order)

- [ ] **Quality check.** Run 10 real pets through every look. Rewrite the prompt for any look that doesn't keep the pet recognisable, in `src/lib/styles.ts`. This is the product.
- [ ] **Real examples.** Save your best result for each look as `public/styles/<style-id>.jpg`. The landing page and style picker switch from gradients to real photos automatically. Use your own pets or friends' pets, with permission.
- [ ] Add a privacy policy and terms page. You're processing people's photos.
- [ ] Name and domain (`BRAND` in `src/lib/config.ts`).

## Known limits

- The full-size image lives on fal.ai's CDN and is fetched on download. If fal expires files sooner than our 30-day window, move them to your own storage (Vercel Blob or R2) in `/api/preview`.
- No print shop yet. The next upsell is printed cards and canvases through a print-on-demand API, sold for December delivery.

## Marketing (TikTok / Instagram)

- **Format:** the reveal. "I turned my dog into a Christmas portrait 🎄", showing the original photo, then the result, with a trending sound. One video per look, per pet.
- **Volume:** 3 posts a day from October 1. Use the slideshow maker (`../slides`) to produce them.
- **Hook for gifters:** "The gift for the friend who loves their dog more than people."
- **Deadline:** post "order by Dec 15" to create urgency.
