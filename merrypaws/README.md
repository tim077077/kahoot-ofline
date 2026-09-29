# Paw Pictures

Your pet, starring in a classic film. Users upload a photo of their pet (and optionally themselves as co-star), pick a film, and get a cinematic still: an old-master royal portrait, 1940s film noir, Technicolor glamour, a silent-era still, a western, the French New Wave, 60s sci-fi, or a 1950s holiday special.

The free preview is small and watermarked. A **ticket** unlocks the full-resolution image.

The app is mobile-first and built to be wrapped as an iOS/Android app with Capacitor (see "Going to the stores" below). The folder is still named `merrypaws` from the first version.

## What's in the app

- **Onboarding**: three short scenes with the mascot, Biscuit. Scene 1 is the pitch; scene 2 asks for the pet's name, which is used in the "credits"; scene 3 picks the first film. It then drops the user straight into the studio, so their first portrait is the aha moment. It's always skippable and can be replayed from Tickets.
- **Studio**: the star (pet photo), an optional co-star (you), and the film picker. Then "Action":
  1. A film-leader countdown shows while Biscuit wears his director's beret.
  2. The still "develops" from black: blur and sepia resolve into the picture.
  3. The title card reads "LUNA in THE ROYAL COURT, 1654".
- **Reel**: every take on this phone, as a contact sheet. You can filter by film, and starred takes become **Highlights**.
- **Viewer**: full-screen, swipe between takes. From there you can star, keep (unlock), save full quality, share, or delete.
- **Premiere**: highlights played back like a screening. Opening credits, a slow push-in on each still with its title, then THE END.
- **Tickets**: the balance, the packs (1 for $19, 3 for $29, 8 for $49), an access link for using tickets on another device, and renaming the pet.

The style world is "film stock": projection-booth darks, silver-screen text, and one Kodak-yellow accent. Type is Big Shoulders for marquee titles, Jost for the interface, and Courier Prime (the screenplay face) for credits and slate details. There's film grain and a vignette over everything, all of it respecting reduced-motion settings. Icons are Phosphor.

## How it works (backend)

- `POST /api/preview`
  - Generates the still with fal.ai.
  - Returns only a small, paw-watermarked preview. The full image stays on the server.
- `POST /api/unlock` spends one ticket. Each portrait is only charged once, even with double taps.
- `POST /api/checkout` → Stripe → `/api/webhook`. The webhook adds tickets and unlocks the portrait the user paid from.
- `GET /api/download/[id]` returns the full resolution, for unlocked portraits only.
- Free previews are capped at 3 per IP per day, with a global daily cap. Buyers get 30 a day.
- Photos never persist on the device beyond the preview. The reel (previews and metadata) lives in `localStorage`, newest 40 takes.

## Run locally

```bash
npm install
cp .env.example .env.local   # all optional locally
npm run dev
```

Without `FAL_KEY` it runs in demo mode: the "still" is your own photo with the watermark.

```bash
npm test            # unlocking, signed Stripe webhook, watermark, prompts
npm run lint
npm run typecheck
npm run build
```

## Before launch (in this order)

1. **Quality check (this is the product).**
   - Run 10 real pets through every film. Also run 5 with an owner photo.
   - Rewrite `scene` in `src/lib/styles.ts` for any film that doesn't keep the pet recognisable.
2. **Real posters.** Save your best still for each film as `public/styles/<film-id>.jpg` (for example `public/styles/film-noir.jpg`). The film cards switch from title cards to real stills automatically. Use your own or friends' pets, with permission.
3. **Name.** "Paw Pictures" is a placeholder in `src/lib/config.ts` (`BRAND`, `MASCOT`). Check that the store name is free before you commit to it.
4. Add a privacy policy and terms page. You're processing people's faces and pets.

## Going to the stores

For the web, deploy on Vercel as-is (Root Directory `merrypaws`). The free `*.vercel.app` address needs no domain. Store builds need three more pieces of work:

1. **Wrap with Capacitor**, the same stack as your Vinted app:
   - Build the client as static files.
   - Set `NEXT_PUBLIC_API_BASE` to the deployed Vercel URL (`src/lib/client.ts` already routes every call through it).
   - Allow CORS from the app's origin on `/api/*`.
2. **In-app purchases.** Apple and Google require their own billing for digital goods, so Stripe can't be used inside the store app.
   - Use RevenueCat with consumable products for the three packs, plus a RevenueCat webhook that grants tickets (replacing the Stripe webhook for app purchases).
   - TrustMRR verifies RevenueCat revenue.
3. **Native touches**, so Apple doesn't reject the app as a wrapped website (guideline 4.2) or yet another AI photo app (4.3): camera capture, save to Photos, the native share sheet.

Google Play also requires a new 12-tester, 14-day closed test for this app. Start it as soon as a build exists.
