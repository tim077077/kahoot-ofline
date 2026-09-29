# Mobilat

AI virtual staging for real-estate listings. An agent uploads a phone photo of a room, picks the room type and a style, and gets back a furnished (or emptied, or restyled) photo with walls, windows and floors left as they were. Romanian first (`/ro`, prices in lei), English second (`/en`, prices in euro).

## Why this idea

TrustMRR data, September 2026:

- **Real estate** has 171 startups, compared with 4,000+ each in AI and SaaS. Small AI staging tools there make real money: KitchenDesign earns $2.5k MRR, AiCasaDesign $1.4k MRR, and Refined Listings has done $800k lifetime.
- The global staging tools are in English and priced in USD. Almost none go after Romanian agents on Imobiliare.ro, Storia and OLX in their own language.
- The buyer is easy to find (every listing shows the agent's phone number) and the value is instant (a before/after they can see).

## Stack

- Next.js 16 (App Router)
- `@fal-ai/client`: `fal-ai/nano-banana/edit` by default, about $0.039 per image
- Stripe Checkout, with one-time packs plus a monthly Pro plan
- Upstash Redis for credits

There are no user accounts. After paying, the browser keeps a random access token, and the buyer can copy an access link to use the credits on other devices.

## Run locally

```bash
npm install
cp .env.example .env.local   # all optional locally
npm run dev                  # http://localhost:3000
```

Without `FAL_KEY` the studio runs in **demo mode** and returns your photo unchanged, so you can test the full flow for free. Without Upstash, credits live in memory.

Checks:

```bash
npm test          # unit tests (credits, free-trial limits, prompts)
npm run lint
npm run typecheck
npm run build
```

## Deploy (Vercel, about 20 minutes)

1. Import the repo into Vercel and set **Root Directory** to `mobilat`.
2. Storage: in Vercel, go to **Storage → Upstash Redis → Connect**. It sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Get a key at https://fal.ai/dashboard/keys and set it as `FAL_KEY`. Add $10 of credit, which covers about 250 images.
4. Stripe:
   - Set `STRIPE_SECRET_KEY`.
   - Create a webhook to `https://YOUR_DOMAIN/api/webhook` with these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`.
   - Set its signing secret as `STRIPE_WEBHOOK_SECRET`.
   - Test with `4242 4242 4242 4242` in test mode first.
5. Set `NEXT_PUBLIC_SITE_URL` (for Stripe redirects) and `NEXT_PUBLIC_CONTACT_EMAIL`.
6. Connect Stripe to TrustMRR on day one, so the revenue history starts counting.

The production build refuses to run the API without Upstash (`503 not_configured`), so paid credits can never land in memory and vanish.

## Before launch checklist

- [ ] Generate 3 real before/after pairs with your own `FAL_KEY` and replace `public/demo/before.svg` and `after.svg`. A real photo sells; an illustration doesn't.
- [ ] Pick a name and domain (`BRAND` in `src/lib/config.ts`).
- [ ] Add a privacy policy and terms page. You're processing photos, and ANPC and GDPR apply in Romania.
- [ ] Add a way to cancel Pro yourself (Stripe customer portal). Until then, cancellations go by email.

## First 10 customers (this is the actual work)

1. Open Storia or Imobiliare.ro and filter for **unfurnished** (nemobilat) apartments in your city.
2. Take the empty-room photo from 20 listings and stage them in Mobilat.
3. Send each agent their own listing, staged, on WhatsApp: "Am mobilat virtual poza din anunțul dumneavoastră, gratuit. Dacă vă ajută, mai am 10 imagini la 29 lei." (Roughly: "I virtually furnished the photo from your listing, for free. If it helps, I have 10 more images for 29 lei.")
4. Track it: sent → replied → paid. Twenty messages a day for a week is 140 agents.
5. Kill rule: if zero agents pay after 100 messages, the problem is the offer or the quality, not the code. Fix one of those, don't add features.

## Code map

| Path | What it does |
|---|---|
| `src/lib/prompts.ts` | The prompts. Every prompt pins the room's architecture. |
| `src/lib/stager.ts` | fal.ai call, with demo mode when there's no key |
| `src/lib/credits.ts` | Tokens, atomic credit spend, free-trial limits, webhook idempotency |
| `src/lib/store.ts` | Upstash REST client with an in-memory fallback |
| `src/app/api/*` | `stage`, `checkout`, `webhook`, `account`, and `image` (same-origin proxy for downloads) |
| `src/components/Studio.tsx` | The app screen |
| `src/lib/i18n.ts` | All copy, RO + EN |
