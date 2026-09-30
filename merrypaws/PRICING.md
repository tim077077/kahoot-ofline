# Pricing: what the plans cost, and why

Researched September 2026. Prices are USD and change often, so re-check them before launch.

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
| Portrait tries every month | first one free | 10 | **45** | 100 |
| Album photos | 30 | 300 | **2,000** | 10,000 |
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
| Store fee (Apple Small Business Program, Google) | 15%; Stripe on the web is about 3% + $0.30 |
| One portrait preview (Nano Banana through fal) | about $0.04 |
| Fallback model (only when the main one fails) | $0.15 |
| One album photo (2048px print + thumbnail) | about 0.65 MB |
| Cloudflare R2 storage | $0.015 per GB-month, free egress, first 10 GB free |

So 1,000 photos cost about **$0.01 a month** to keep. Storage is almost free; the photo limit separates the plans, it doesn't protect our costs.

**Cost to us:**

- Unlocking an HD portrait costs nothing extra: the image already exists.
- Worst case assumes every try is used every month.
- Typical case: Starter about 5 tries, Plus about 16 (a portrait every other day or so), Pro about 30.

| Plan | We keep after 15% | Worst-case cost | Worst-case margin | Typical margin |
|---|---|---|---|---|
| Starter monthly | $2.54/mo | $0.40 | $2.14 (84%) | $2.34 (92%) |
| Starter yearly | $1.42/mo | $0.40 | $1.02 (72%) | $1.22 (86%) |
| **Plus monthly** | $3.39/mo | $1.82 | $1.57 (46%) | $2.73 (81%) |
| **Plus yearly** | $2.12/mo | $1.82 | $0.30 (14%) | $1.46 (69%) |
| Pro monthly | $6.79/mo | $4.10 | $2.69 (40%) | $5.49 (81%) |
| Pro yearly | $4.96/mo | $4.10 | $0.86 (17%) | $3.66 (74%) |
| 3 portraits | $2.54 | $0.36 | $2.18 (86%) | |
| 10 portraits | $5.94 | $1.20 | $4.74 (80%) | |
| 25 portraits | $11.04 | $3.00 | $8.04 (73%) | |

**The honest risk: Plus yearly.** "A portrait every day" at $29.99 a year leaves almost no margin for someone who uses all 45 tries every month. Watch the real usage. If heavy users are common, cut tries to 35 or move yearly to $34.99; both are one line in `src/lib/config.ts`.

**Free users** cost about $0.04 each: one preview, plus storage for 30 photos. The global daily cap (300 free previews) limits the worst day to $12.

## Fixed costs, and break-even

| Item | Cost |
|---|---|
| Apple developer | $99/yr (about $8/mo); Google's $25 is already paid |
| Vercel | Hobby is non-commercial. Once you charge, Pro is $20/mo (or move the API to Cloudflare Workers) |
| Upstash Redis and Cloudflare R2 | free tiers cover the first thousands of users |

That's about **$30 a month**. Break-even is roughly 11 Plus monthly members, or 21 yearly ones, at typical use.

## Levers if conversion is low

1. **A 7-day free trial on Plus yearly.** Common in this category, and easy in RevenueCat. The best moment to offer it is a streak milestone (day 7), when motivation peaks.
2. **A lower photo cap on Free** (for example 20) if people fill the album but don't upgrade.
3. **A physical print shop** (framed prints, a printed album) for later. Physical goods aren't covered by Apple's in-app purchase rule, and margins are larger.

Sources: [Petpix](https://apps.apple.com/us/app/petpix-ai-pet-avatars/id1660518091), [Pawtograph](https://apps.apple.com/us/app/-/id6751736139), [PawPic](https://apps.apple.com/us/app/-/id6740018548), [PawScene](https://apps.apple.com/app/id6760565689), [Pounce](https://apps.apple.com/us/app/-/id1537466540), [AI pet portrait apps compared](https://www.pawcaso.studio/blog/best-ai-pet-portrait-apps-2025), [Pet care apps 2026](https://www.petiogo.com/blog/best-pet-care-apps-2026), [Memory apps](https://memorymurals.com/journal/best-memory-sharing-apps), [Dazz Cam](https://mwm.ai/apps/dazz-cam/1500395485), [1998 Cam](https://apppricinglab.com/app/apple/1450480287), [Cloudflare R2 pricing](https://www.spendbase.co/?p=35561), [Image model pricing](https://pricepertoken.com/image).
