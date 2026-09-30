# Paw Pictures

A vintage album for your pet:

- Keep their photos as prints in an old family album.
- They're sorted into highlights (walks, naps, birthdays), and each highlight becomes a scrapbook collage and a little film.
- Turn any photo into a vintage portrait.

It's built as a daily habit people share with friends:

- a photo-a-day roll with gentle streaks
- "A year ago today" memories
- the Pack, where friends see each other's pet photo of the day
- a one-tap Instagram Story on everything

Membership holds the album; extra portrait credits are one-off packs.

- The numbers are in [PRICING.md](PRICING.md).
- The behavioural design and its guardrails are in [PSYCHOLOGY.md](PSYCHOLOGY.md).
- Instagram Stories setup for the store app is in [docs/INSTAGRAM.md](docs/INSTAGRAM.md).
- **Putting it online, step by step: [DEPLOY.md](DEPLOY.md).**

The app is mobile-first and built to be wrapped as an iOS/Android app with Capacitor (see "Going to the stores"). The folder is still named `merrypaws` from the first version.

## The onboarding (4 scenes, no account, no forms)

1. **The promise**: Biscuit's own album page, three taped instant photos with date stamps. "Every good dog deserves an album."
   - "Already have an album? Sign in" brings an album back on a new phone.
2. **The star**: their name, written in ink, and whether they're a dog, a cat or another friend.
3. **Their photos**: pick 5 to 12. They upload in the background, with a quiet guest account created on the first upload.
4. **Chapter one**: their own photos land on the first album page, taped at angles. That's the aha, before any price.
   - Then "Open Luna's album".
   - Or "Make a vintage portrait, the first is free".

## The app

- **Photo of the day** (top of the album):
  - The day's prompt, a film-strip streak, freezes that cover a missed day, and one button.
  - Once today's photo is in: "Story" and "The pack".
  - Milestones at 3, 7, 14, 30, 50, 100, 200 and 365 days.
  - "In loving memory" albums have no streak at all.
- **Daily reminder**: offered right after a photo of the day ("A nudge tomorrow?"), at an hour the member picks.
  - One a day at most, and only if today's photo isn't in. Never for memorial albums.
  - Web push: works in Chrome, Edge, Firefox and on Android. On iPhone it works once the site is on the Home Screen, and the app says so.
- **Keep it safe**: once the album has 5 photos, a card offers to back it up with an email. No password: a 6-digit code by email.
  - After a purchase, the backup sheet opens by itself.
  - A new phone signs in with the same email and gets the album, the pet's name and the roll back.
- **A year ago today**: memories from the same day in earlier years, or a month ago while the album is young.
- **Pack**:
  - Friends' pet photo of the day, with paw, heart and laugh reactions.
  - Today only, no endless feed.
  - Invite by link (`?pack=CODE`) or code.
  - Only the photo of the day is shared, and "Friends can see it" turns it off.
- **Album**:
  - The star's name in script and a handwritten count ("9 memories since 2024").
  - Highlights as little stacks of prints with label-maker tags.
  - Every photo as a deckle-edged print, grouped by year (by month once the album passes 40 photos).
  - A film look picker: Original, Summer, Faded '70s, Golden hour, Sepia, Silver. Free has the first two.
  - A usage meter.
- **Adding photos**: pick up to 50, answer one optional question ("What was Luna up to?"), and they develop into the album. Photos are resized on the phone, and the date they were taken is read from the photo itself.
- **A photo**: the print with its orange date stamp, a caption written "on the back", highlight tags (built-in or your own), favourite, share, remove.
- **A highlight**:
  - A scrapbook page: instant photos and deckled prints at angles, masking tape, date stamps and handwritten captions.
  - **Play** turns it into a short film: a title card, each photo with a slow push-in and a light leak, then THE END.
  - **Share** makes a 9:16 scrapbook page for stories.
- **Portraits**: the portrait studio. The star's photo can come from the album. There are 6 eras, "Add me too" and "In loving memory". A darkroom loader shows honest progress, then the reveal. See "Prompts".
- **Membership**:
  - a member card (plan, renewal, HD credits, photo usage)
  - **Manage or cancel your plan**
  - Starter, Plus and Pro, with Pro first as the anchor and Plus highlighted in the middle
  - "In loving memory"
  - extra portrait packs
  - the pet's name and kind
  - "Keep it safe": the backup email, "Sign in to another album", and the old access link
  - the daily reminder: time, "Send one now", turn off
  - privacy, and Delete my data (which cancels an active subscription first)

## The look

A family album on real paper:

- **Paper**: a cream page with a faint fibre texture, sand mounts, espresso ink, and one burgundy accent. Dark mode is the same album at night.
- **Type**:
  - Bodoni Moda for titles
  - Pinyon Script for names
  - Homemade Apple handwriting for captions and dates
  - Jost for everything you read, 16px minimum
- **Vintage details**, all built in CSS/SVG with no image assets:
  - deckle-edged prints
  - instant-photo frames
  - masking tape
  - the orange point-and-shoot date stamp
  - embossed label-maker tags
  - perforated ticket edges
  - light leaks
  - film grain on photos, never on text

Every text colour pair is at least 4.5:1 contrast. Motion respects reduced-motion settings.

## Prompts (the product)

Each era in `src/lib/styles.ts` is a structured prompt, in this order:

1. The medium.
2. Identity rules: the same individual animal, markings on the correct side, the person unbeautified.
3. Wardrobe, set and pose (pet alone, or pet plus owner), light, camera, palette, texture and mood.
4. Output rules and era-specific things to avoid.

There are no trademarks, and a test enforces it.

Before every prompt or model change:

```bash
# ~20 real pet photos in prompt-lab/photos/, optionally one person in prompt-lab/owner.jpg
FAL_KEY=... npm run lab -- --yes
# then open prompt-lab/out/index.html and ask of every cell: is that the same animal?
```

**Why fal.ai:** it's a gateway, not the model. One key covers many models, and there's an automatic fallback. The main model is Nano Banana edit, about $0.04 an image. Compare Nano Banana 2, FLUX Kontext and Seedream with the prompt lab.

## Backend

### Accounts and album

- Accounts are passwordless: the phone keeps a random token, and the server stores only its hash.
- `POST /api/account` makes a guest account (on the first photo).
- `GET /api/account` returns the plan, credits, previews and photo usage, and refills the monthly allowance if a new 30-day cycle started.
- `DELETE /api/account` removes everything and cancels the subscription.
- **Album**: `GET/POST /api/photos` and `PATCH/DELETE /api/photos/[id]`.
  - Metadata lives in a Redis hash per account.
  - Files go to S3-compatible storage: a 2048px print and a 480px thumbnail.
  - The phone loads files straight from the bucket with 24h signed URLs.
  - The plan's photo limit is enforced on the server. Going over never deletes anything.

### Backup and sign-in

- `POST /api/auth/code` emails a 6-digit code (Resend). `backup` needs this phone's token; `signin` answers the same whether or not the email has an album.
  - Codes last 15 minutes, work once, and die after 5 wrong tries. 3 codes per email per 15 minutes, 10 per IP per hour.
- `POST /api/auth/verify` checks it. Backup links the email to the album; sign-in gives this phone its own token.
- Every phone has its own token, so "Delete my data" signs them all out and frees the email.
- `GET /api/profile` brings the pet's details to a new phone.

### Daily reminder

- `GET/PUT/DELETE /api/push` stores this album's push subscription, hour and time zone.
  - Subscriptions sit in 24 buckets by UTC hour. The phone re-sends its subscription on every open, which follows clock changes and travel.
- `POST /api/push/test` sends one now (3 an hour).
- `GET /api/push/cron` (hourly, `Authorization: Bearer $CRON_SECRET`) sends the reminders due this hour. It skips anyone whose photo is in, memorial albums, and anyone already reminded today. Dead subscriptions are removed.
- `public/sw.js` shows the notification; `src/app/manifest.ts` makes the site installable.
- `GET /api/health` says which services are set up (never any key).

### Portraits

- `POST /api/preview` generates a portrait: the main model, then the fallback. It spends, in order:
  1. the plan's monthly previews
  2. pack previews
  3. the one free preview per device

  It's also capped at 4 a minute. A failed generation gives the preview back.
- `POST /api/unlock` spends an HD credit, once per portrait.
- `GET /api/download/[id]` returns the full portrait, only once it's unlocked.

### Payments (web)

- `POST /api/checkout` opens Stripe: a subscription for plans, a one-off payment for packs.
- `/api/webhook` handles these events:

  | Event | What it does |
  |---|---|
  | `checkout.session.completed` | starts a plan, or adds pack credits |
  | `invoice.paid` | extends the plan to the end of the period just paid for |
  | `customer.subscription.deleted` | ends the plan |

  A failed renewal simply lapses 3 days after the period ends.

### Daily roll and the Pack

- `GET /api/daily?day=` settles the streak for the phone's local day: it spends freezes, pauses while a free album is full, or breaks.
  - It returns the count, freezes, the last 14 days and the day's entry.
  - `PATCH /api/daily` shows or hides a day's photo from the pack.
- Adding a photo, or making a portrait, marks the day (`day` form field).
- `PUT /api/profile` sets the pet's name, kind and memorial flag that friends see.
- The Pack:
  - `GET /api/pack?day=` returns my card plus friends' cards and my invite code.
  - `POST /api/pack/join` joins with a code.
  - `POST /api/pack/react` toggles a reaction.
  - `DELETE /api/pack/[id]` leaves.
- `POST /api/billing` opens Stripe's billing page, so web subscribers can manage or cancel.

### Funnel, moderation, stats

- `POST /api/event` records funnel counters (onboarding steps, photos added, highlights opened, paywall shown, purchase, share).
- `GET /api/stats` with `Authorization: Bearer $STATS_KEY` shows the last 14 days.
- `POST /api/report` stores portrait reports for 90 days.

## Run locally

```bash
npm install
cp .env.example .env.local   # all optional locally
npm run dev
```

Locally, with no keys:

- portraits run in demo mode (your photo, watermarked)
- data lives in memory
- album photos are written to `.data/`

```bash
npm test            # plans, album, allowances, webhook, limits, deletion, backup codes, reminders, events, EXIF, photo checks, prompts
npm run lint
npm run typecheck
npm run build
```

Locally, sign-in codes are printed in the terminal and shown on the page, and reminders need VAPID keys (see `.env.example`).

## Before launch (in this order)

1. **Put it online** with [DEPLOY.md](DEPLOY.md): Vercel, Upstash, R2, fal, Resend, VAPID keys and an hourly timer. Check `/api/health`.
2. **Portrait quality.** Run the prompt lab on 20 real pets (`npm run lab -- --sample` gets 20 random dogs to start).
3. **Real example stills** for the era cards, in `public/styles/<era-id>.jpg`.
4. **Name.** "Paw Pictures" and "Biscuit" are placeholders in `src/lib/config.ts`.
5. **Privacy policy and terms.** Photos are private, used only for the album and requested portraits, never for training.
   - Portrait uploads go through fal's file storage. Check fal's retention before promising a deletion window.
6. **Hosting.** Vercel Hobby is non-commercial. Move to Pro ($20/mo) once you charge.

## Going to the stores

1. **Wrap with Capacitor**, the same stack as your other app:
   - Build the client as static files.
   - Set `NEXT_PUBLIC_API_BASE` to the deployed URL.
   - Allow CORS on `/api/*`.
2. **In-app purchases with RevenueCat.** Stripe isn't allowed for digital goods in store apps.
   - Starter, Plus and Pro become auto-renewing subscriptions; the three packs become consumables.
   - A RevenueCat webhook calls the same `activatePlan` / `endPlan` and `addCredits` / `addPackPreviews` functions the Stripe webhook uses.
   - Add **Restore purchases**.
   - Keep a 7-day trial on Plus yearly as a lever.
   - TrustMRR verifies RevenueCat revenue.
3. **Native touches**, so Apple doesn't reject it as a wrapped website:
   - native push for the daily prompt (the web version already works; the store app replaces it)
   - Instagram Stories straight from the app ([docs/INSTAGRAM.md](docs/INSTAGRAM.md))
   - the native photo picker (multi-select)
   - save to Photos
   - the native share sheet
   - Sign in with Apple, if you ever add login

Google Play needs a new 12-tester, 14-day closed test for this app. Start it as soon as a build exists.
