# Pricing: what the plans cost, and why

Researched September 2026; image costs and limits updated October 2026. Prices are USD and change often, so re-check them before launch.

## The model

- **Membership** holds the album: how many photos it keeps, every film look, and a monthly allowance of portraits.
- **Extra portrait credits** are one-off packs on top of any plan, for people who only want portraits.

Why a subscription: an album is something people come back to every week, so it earns a subscription. The old model sold one-off tickets at $19 each, which is only an impulse buy. Subscriptions are also recurring revenue, which is what TrustMRR buyers look at; one-off packs don't recur.

## The plans

Three paid plans, shown most expensive first (the anchor), with **Plus** in the middle, highlighted as "Most loved" and preselected on yearly. Why this layout works, and the guardrails around it, are in [PSYCHOLOGY.md](PSYCHOLOGY.md).

| | Free | Starter | **Plus** | Pro |
|---|---|---|---|---|
| Price | $0 | $2.99/mo or $19.99/yr | **$3.99/mo or $29.99/yr** | $7.99/mo or $69.99/yr |
| HD portraits every month | none | 5 | **30 (one a day)** | 60 |
| Portrait tries every month | first one free | 10 | **30** | 60 |
| Album photos | 50 | 300 | **2,000** | 10,000 |
| Film looks | 2 | all 6 | **all 6** | all 6 |
| Streak freezes a month | 1 | 2 | **4** | 4 |
| Photo-a-day roll, the Pack, highlights, collages, slideshows, Instagram Stories | yes | yes | **yes** | yes |

- **The anchor:** Pro at $69.99/yr makes Plus's $29.99 look like less than half.
- **The decoy:** Starter's 5 portraits for $19.99 makes 30 portraits for $10 more the obvious pick.
- **Per day:** Plus yearly works out to about 8¢ a day, and the card says so.

Social and habit features are free for everyone. Friends bring friends, and a free member with a 30-day streak is the most likely person to upgrade.

**Extra portrait credits** stay as one-off packs: 3 for $2.99, 10 for $6.99, 25 for $12.99. One credit keeps a portrait in HD and adds 3 tries. Credits never expire.

**How allowances work:**

- Monthly tries refill every 30 days and don't roll over.
- HD credits and freezes roll over, up to 5 freezes.
- If a member cancels, nothing is deleted. They just can't add photos past the free limit, and the roll pauses instead of breaking.

## What competitors charge

**AI pet portrait apps.** Most charge weekly:

| App | Price |
|---|---|
| PawPic | $1.99/week or $19.99/year |
| Petpix | $2.99/week, plus extra for HD saves |
| Pawtograph | $5.99/week or $59.99/year |
| PawScene | $6.99/week or $14.99/month |
| PawFav | $8.99/month |
| Pounce | $19.99 to $59.99/year |
| Pay-per-portrait sites | $5 to $20 per portrait |

**Pet memory and journal apps:**

| App | Price |
|---|---|
| Petio Plus | $5.99/month or $47.99/year |
| Memory Murals (family memories) | $12.99/month or $99.99/year |
| Dog Diary | $9.99 one-time |

**Vintage camera apps** (the aesthetic people already pay for):

| App | Price |
|---|---|
| 1998 Cam | $2.99/month or $17.99/year |
| Dazz Cam | $49.99/year or $14.99 lifetime |

**The gap:** nobody combines a pet album, highlight collages and vintage portraits. The portrait apps are cold AI tools with weekly paywalls; the memory apps are health trackers with a photo tab.

**Price position:**

- Starter at $19.99/yr matches PawPic and 1998 Cam.
- Plus at $29.99/yr, with a portrait every day, is half of Pawtograph ($59.99), a third of PawFav ($107.88 a year) and cheaper than Petio ($47.99).
- On Plus a kept portrait costs about 8¢, against $5 to $20 on pay-per-portrait sites.

## What each plan costs us

**Assumptions:**

| Item | Cost |
|---|---|
| Store fee | 15% with Apple's Small Business Program and on Google; 30% for Apple without it. On the web: RevenueCat Web Billing's fee plus Stripe's card processing |
| One portrait try (Gemini Nano Banana 2.1 at 1K, straight from Google) | $0.0336 output + about $0.003 input = **$0.037** |
| Fallback model (Nano Banana 2, only when the main one fails) | about $0.07 |
| One album photo (2048px print + thumbnail) | about 0.65 MB |
| Cloudflare R2 storage | $0.015 per GB-month, free egress, first 10 GB free |

Why Google directly and not fal.ai: it's the same model with no reseller in between, and fal's default model (Gemini 2.5 Flash Image) is being shut down by Google. Sources: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini models](https://ai.google.dev/gemini-api/docs/models).

So 1,000 photos cost about **$0.01 a month** to keep. Storage is almost free; the photo limit separates the plans, it doesn't protect our costs.

**Cost to us:**

- Only tries cost money. Unlocking an HD portrait costs nothing extra: the image already exists.
- Every plan has at least as many tries as HD portraits, so every HD portrait is covered.
- Worst case assumes every try is used every month. Typical: Starter about 5 tries, Plus about 16, Pro about 30.

| Plan | We keep after 15% | Worst-case cost | Worst case at 15% | Worst case at 30% | Typical at 15% |
|---|---|---|---|---|---|
| Starter monthly | $2.54/mo | $0.37 | $2.17 (85%) | $1.72 (82%) | 93% |
| Starter yearly | $1.42/mo | $0.37 | $1.05 (74%) | $0.80 (68%) | 87% |
| **Plus monthly** | $3.39/mo | $1.11 | $2.28 (67%) | $1.68 (60%) | 83% |
| **Plus yearly** | $2.12/mo | $1.11 | $1.01 (48%) | $0.64 (37%) | 72% |
| Pro monthly | $6.79/mo | $2.22 | $4.57 (67%) | $3.37 (60%) | 84% |
| Pro yearly | $4.96/mo | $2.22 | $2.74 (55%) | $1.86 (46%) | 78% |
| 3 portraits (9 tries) | $2.54 | $0.33 | $2.21 (87%) | | |
| 10 portraits (30 tries) | $5.94 | $1.11 | $4.83 (81%) | | |
| 25 portraits (75 tries) | $11.04 | $2.77 | $8.27 (75%) | | |

**No plan can lose money.** Plus used to give 45 tries and Pro 100. At 45 tries, a heavy Plus yearly member left 22% at a 15% store fee and lost money at 30%. Now Plus is a try a day (30) and Pro is 60. `src/lib/plans.test.ts` fails the build if any plan or pack drops under a 35% worst-case margin at a 30% store fee, so a future price or limit change can't quietly bring the loss back.

**Join Apple's Small Business Program** (free, for under $1M a year). It takes Apple's cut from 30% to 15%, which is the biggest single cost on every plan.

**Free users** cost about $0.037 each: one try, plus storage for 50 photos. The global daily cap (300 free tries) limits the worst day to about $11.

## Fixed costs, and break-even

| Item | Cost |
|---|---|
| Cloudflare Workers (the app, the hourly reminder job) | free up to 100,000 requests a day; previews are watermarked by Cloudflare Images, free for 5,000 a month. Then Workers Paid at $5/mo |
| Upstash Redis and Cloudflare R2 | free tiers cover the first thousands of users |
| Google Gemini API | pay as you go, no monthly fee (image models have no free tier) |
| A domain (for backup emails) | about $10/yr |
| Apple developer | $99/yr, only once the app goes on the App Store; Google's $25 is already paid |

The web app costs about **$1 a month** in fixed costs (the domain). With the App Store and Workers Paid it's about $14: break-even is about 5 Plus monthly members, or 10 yearly ones, at typical use.

## Levers if conversion is low

1. **A 7-day free trial on Plus yearly.** Common in this category, and easy in RevenueCat. The best moment to offer it is a streak milestone (day 7), when motivation peaks.
2. **A lower photo cap on Free** (back to 30) if people fill the album but don't upgrade. It's 50 now so the album fills after the habit forms (a month-plus of photos of the day), not before.
3. **A physical print shop** (framed prints, a printed album) for later. Physical goods aren't covered by Apple's in-app purchase rule, and margins are larger.

Sources: [Petpix](https://apps.apple.com/us/app/petpix-ai-pet-avatars/id1660518091), [Pawtograph](https://apps.apple.com/us/app/-/id6751736139), [PawPic](https://apps.apple.com/us/app/-/id6740018548), [PawScene](https://apps.apple.com/app/id6760565689), [Pounce](https://apps.apple.com/us/app/-/id1537466540), [AI pet portrait apps compared](https://www.pawcaso.studio/blog/best-ai-pet-portrait-apps-2025), [Pet care apps 2026](https://www.petiogo.com/blog/best-pet-care-apps-2026), [Memory apps](https://memorymurals.com/journal/best-memory-sharing-apps), [Dazz Cam](https://mwm.ai/apps/dazz-cam/1500395485), [1998 Cam](https://apppricinglab.com/app/apple/1450480287), [Cloudflare R2 pricing](https://www.spendbase.co/?p=35561), [Image model pricing](https://pricepertoken.com/image).
