# Paw Pictures

Turn your pet into a memory. A user picks a photo of their pet (and, if they like, one of themselves), chooses an era, and gets a vintage portrait: an old-master oil painting, a faded 1970s summer snapshot, 1950s studio glamour, film noir, a silent-film still, or a 1950s Christmas.

The first portrait is free, small and watermarked. A **ticket** keeps a portrait in HD.

The app is mobile-first and built to be wrapped as an iOS/Android app with Capacitor (see "Going to the stores"). The folder is still named `merrypaws` from the first version.

## The flow (value first, account last)

1. **Intro**: one screen. A before-and-after loop of Biscuit, the mascot (a curly brown dog), turning into a 1654 oil portrait. One line, one button. It's shown once.
2. **Photo**: the system photo picker, plus 2 good and 2 bad examples. The phone checks the photo (too small, too dark, blurry) before any money is spent. It explains the problem in one sentence and lets the user pick again or use it anyway.
3. **Era**: 6 era cards with a default already selected. Also:
   - an optional name for the title card
   - "Add me too", to be in the portrait with the pet
   - "In loving memory", which makes the wording gentler everywhere and removes sales pressure
4. **Darkroom**: the user's photo shown as a film negative, with honest steps. "Loading the film" shows the real upload percentage, "Developing" shows real elapsed time, and "Drying the print" covers decoding the image.
5. **Reveal**: the print develops from a pale sepia ghost to full colour, then the title card appears ("Luna in The Royal Court, 1654"). Buttons: **Save in HD**, **Share**, **Try another era**.
6. **Paywall**: only shown after the reveal. It lists the plans honestly, has a visible "Not now", and never appears for a portrait that's already paid for.

Tabs:

- **Studio** (the flow above)
- **Album**: highlights (tap the heart) shown as arch-framed prints, then every portrait mounted with photo corners, with a filter by era
- **Tickets**: balance, plans, access link, the pet's name, a privacy note and **Delete my data**

The viewer can save, share, heart, remove and **report** a portrait.

**Share** makes a card from the portrait: a print on cream paper with its title and a small "made with" mark, as a 9:16 story or a 4:5 post. Previews keep their watermark on the card; kept portraits share in full quality.

## The look

The family album:

| Element | Choice |
|---|---|
| Background | cream paper `#f5eee3` |
| Surfaces | sand `#e4d3b0` |
| Text | espresso ink `#2a1b14` |
| Accent (the only one) | burgundy `#7a0f1b` |

In dark mode it's the same album at night: espresso paper, cream text, and cream buttons in place of burgundy. Every text colour pair is at least 4.5:1 contrast.

Type:

- **Bodoni Moda** for titles
- **Pinyon Script** for the star's name
- **Jost** for everything you read, at 16px minimum

Film grain appears only on photographs, never over text. Motion is limited to one reveal moment plus Biscuit's idle animation, and everything respects reduced-motion settings. Icons are Phosphor.

Until real example portraits exist, each era card shows Biscuit in that era's costume and colour treatment. Drop your best real result for each era into `public/styles/<era-id>.jpg` and the card switches to it automatically.

## Prompts (the product)

Each era in `src/lib/styles.ts` is a structured prompt. The order matters:

1. **Medium**: what the picture physically is, e.g. an oil painting on canvas.
2. **Identity rules**, before anything else:
   - Pet: this must be the same individual animal, not just the same breed. Keep head and muzzle shape, ears, eye colour, nose, every marking on the correct side, coat length and texture, and build.
   - Owner: same face, skin tone, hair, age and glasses, with no beautifying.
3. **The scene**:
   - wardrobe (never anything that covers the eyes or muzzle)
   - set
   - pose (one version for the pet alone, one for pet plus owner)
   - light, camera and framing
   - palette, surface texture and mood
4. **Output rules and era-specific things to avoid.**

There are no trademarks anywhere, and a test enforces it.

### Prompt lab

Run this before every prompt or model change:

```bash
# 1. Put ~20 real pet photos in prompt-lab/photos/ (different breeds and colours,
#    bad light, odd markings) and optionally one person in prompt-lab/owner.jpg
# 2. Run every era on every photo (prints a cost estimate first):
FAL_KEY=... npm run lab -- --yes
FAL_KEY=... npm run lab -- --yes --model fal-ai/gemini-3-pro-image-preview/edit --price 0.15
# 3. Open prompt-lab/out/index.html. Ask of every cell: is that the same animal?
```

Photos and results stay local; they're gitignored.

### Why fal.ai

fal.ai is a gateway, not the model. One key gives you many image models, so switching is a config change (`FAL_MODEL`). There's also an automatic fallback model (`FAL_FALLBACK_MODEL`) for when the main one fails.

- **Main model:** Google's Nano Banana edit, about $0.04 an image.
- **Fallback:** the Pro model, about $0.15, and only used on failure.

**Next step:** use the prompt lab to compare models on *your* photos. Candidates:

- Nano Banana 2
- FLUX Kontext
- Seedream

Keep whichever keeps pets most recognisable. If it's a Google model and volume grows, calling Google directly saves fal's markup (roughly 15 to 20%).

## How it works (backend)

- `POST /api/preview`
  - Generates the portrait (main model, then the fallback).
  - Returns only a small, softly watermarked preview. The full image stays on the server.
- `POST /api/unlock` spends one ticket. Each portrait is only charged once, even with double taps.
- `POST /api/checkout` → Stripe → `/api/webhook`. The webhook adds tickets and unlocks the portrait the user paid from.
- `GET /api/download/[id]` returns the full resolution, for unlocked portraits only.
- `POST /api/report` stores a report for 90 days under `report:<id>`.
- `DELETE /api/account` deletes the account, its tickets and this device's portraits.
- `POST /api/event` records funnel counters: `intro_seen`, `photo_step`, `photo_rejected`, `style_step`, `reveal_seen`, `paywall_shown`, `share`, and more. The server adds `generation_ok`, `generation_failed`, `guest_refused` and `purchase`.
- `GET /api/stats` with `Authorization: Bearer $STATS_KEY` shows the last 14 days of those counters.

**Limits:**

- Guests get 1 free portrait per device.
- As a backstop, there are 3 per IP per day, plus a global daily cap. That cap is your worst-case spend.
- Buyers get 30 previews a day, at most 4 a minute.
- A failed generation never uses up the free portrait.
- Every failure is logged as one JSON line with a reason.

The album (previews and metadata) lives in `localStorage` on the phone, newest 40 portraits.

## Run locally

```bash
npm install
cp .env.example .env.local   # all optional locally
npm run dev
```

Without `FAL_KEY` it runs in demo mode: the "portrait" is your own photo with the watermark.

```bash
npm test            # unlocking, webhook, limits, deletion, events, photo checks, prompts
npm run lint
npm run typecheck
npm run build
```

## Before launch (in this order)

1. **Quality (this is the product).** Run the prompt lab on 20 real pets. Also test with owner photos. Fix any era that doesn't keep the pet recognisable.
2. **Real example stills** in `public/styles/`, using your own or friends' pets, with permission.
3. **Name.** "Paw Pictures" and "Biscuit" are placeholders in `src/lib/config.ts`. Check the store name is free first.
4. **Privacy policy and terms.**
   - Say plainly that photos are processed to make the portrait and are never used for training.
   - Uploads currently go through fal's file storage. Check fal's retention before promising a deletion window, or send images inline instead.
5. **Moderation.** Rely on the model's safety filter, and review `report:*` keys weekly.

## Going to the stores

For the web, deploy on Vercel as-is (Root Directory `merrypaws`). The free `*.vercel.app` address needs no domain. Store builds need three more pieces of work:

1. **Wrap with Capacitor**, the same stack as your other app:
   - Build the client as static files.
   - Set `NEXT_PUBLIC_API_BASE` to the deployed URL.
   - Allow CORS on `/api/*`.
2. **In-app purchases.** Apple and Google require their own billing for digital goods, so Stripe can't be used in the store app.
   - Use RevenueCat with consumables for the three plans, plus a RevenueCat webhook that grants tickets.
   - Add a **Restore purchases** button.
   - TrustMRR verifies RevenueCat revenue.
3. **Native touches**, so Apple doesn't reject it as a wrapped website or another AI photo app:
   - the native photo picker
   - save to Photos
   - the native share sheet
   - Sign in with Apple, if you add any login

Google Play also needs a new 12-tester, 14-day closed test for this app. Start it as soon as a build exists.
