# Pricing: what the plans cost, and why

Researched September 2026. Prices are USD and change often, so re-check them before launch.

## The model

- **Membership** holds the album: how many photos it keeps, every film look, and a monthly allowance of portraits.
- **Extra portrait credits** are one-off packs on top of any plan, for people who only want portraits.

Why a subscription: an album is something people come back to every week, so it earns a subscription. The old model sold one-off tickets at $19 each, which is only an impulse buy. Subscriptions are also recurring revenue, which is what TrustMRR buyers look at; one-off packs don't recur.

## The plans

| | Free | Plus | Pro |
|---|---|---|---|
| Price | $0 | $2.99/mo or $19.99/yr | $5.99/mo or $39.99/yr |
| Album photos | 30 | 1,000 | 10,000 |
| Highlights, collages, slideshows | yes | yes | yes |
| Film looks | 2 | all 6 | all 6 |
| Portrait previews every month | first one free | 20 | 40 |
| HD portraits every month | none | 2 | 6 |

**Extra portrait credits.** One credit keeps a portrait in HD and adds 3 previews. Credits never expire.

| Pack | Price | Per portrait |
|---|---|---|
| 3 portraits | $2.99 | $1.00 |
| 10 portraits | $6.99 | $0.70 |
| 25 portraits | $12.99 | $0.52 |

**How allowances work:**

- Monthly previews refill every 30 days and don't roll over.
- HD credits do roll over.
- If a member cancels, nothing is deleted. They just can't add photos past the free limit.

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

**Price position:** Plus at $19.99/yr matches PawPic and 1998 Cam. It's a third of Pawtograph and PawFav, and cheaper than Petio. Portraits at $0.52 to $1.00 each undercut every pay-per-portrait option.

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
- Worst case assumes every preview is used every month. Typical assumes about 5.

| Plan | We keep after 15% | Worst-case cost | Worst-case margin | Typical margin |
|---|---|---|---|---|
| Plus monthly | $2.54/mo | $0.81 | $1.73 (68%) | $2.33 (92%) |
| Plus yearly | $1.42/mo | $0.81 | $0.61 (43%) | $1.21 (85%) |
| Pro monthly | $5.09/mo | $1.70 | $3.39 (67%) | $4.88 (96%) |
| Pro yearly | $2.83/mo | $1.70 | $1.13 (40%) | $2.62 (93%) |
| 3 portraits | $2.54 | $0.36 | $2.18 (86%) | |
| 10 portraits | $5.94 | $1.20 | $4.74 (80%) | |
| 25 portraits | $11.04 | $3.00 | $8.04 (73%) | |

**Free users** cost about $0.04 each: one preview, plus storage for 30 photos. The global daily cap (300 free previews) limits the worst day to $12.

## Fixed costs, and break-even

| Item | Cost |
|---|---|
| Apple developer | $99/yr (about $8/mo); Google's $25 is already paid |
| Vercel | Hobby is non-commercial. Once you charge, Pro is $20/mo (or move the API to Cloudflare Workers) |
| Upstash Redis and Cloudflare R2 | free tiers cover the first thousands of users |

That's about **$30 a month**. Break-even is roughly 12 Plus monthly members, or 21 yearly ones.

## Levers if conversion is low

1. **A 7-day free trial on Plus yearly.** Common in this category, and easy in RevenueCat.
2. **A lower photo cap on Free** (for example 20) if people fill the album but don't upgrade.
3. **A physical print shop** (framed prints, a printed album) for later. Physical goods aren't covered by Apple's in-app purchase rule, and margins are larger.

Sources: [Petpix](https://apps.apple.com/us/app/petpix-ai-pet-avatars/id1660518091), [Pawtograph](https://apps.apple.com/us/app/-/id6751736139), [PawPic](https://apps.apple.com/us/app/-/id6740018548), [PawScene](https://apps.apple.com/app/id6760565689), [Pounce](https://apps.apple.com/us/app/-/id1537466540), [AI pet portrait apps compared](https://www.pawcaso.studio/blog/best-ai-pet-portrait-apps-2025), [Pet care apps 2026](https://www.petiogo.com/blog/best-pet-care-apps-2026), [Memory apps](https://memorymurals.com/journal/best-memory-sharing-apps), [Dazz Cam](https://mwm.ai/apps/dazz-cam/1500395485), [1998 Cam](https://apppricinglab.com/app/apple/1450480287), [Cloudflare R2 pricing](https://www.spendbase.co/?p=35561), [Image model pricing](https://pricepertoken.com/image).
