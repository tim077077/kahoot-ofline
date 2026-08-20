---
name: hotel-website-oneshot
description: >-
  One-shot a complete, bespoke marketing website for a hotel, guesthouse, pension,
  B&B, villa or cazare from its PHOTOS, reviews, description and amenities. The theme
  (palette, typography, mood) is derived from the actual photos — never generic AI
  defaults. Outputs a self-contained multi-file static site (index.html + styles.css
  + main.js), mobile-first, no build step, no libraries. Use whenever asked to
  build/generate/design a website for a specific lodging property from supplied
  photos and details. Requires a vision-capable model with the photos attached.
---

# Hotel Website — One-Shot Builder

You will design and build a complete website for ONE hospitality property (hotel,
guesthouse, pension, B&B, villa, cabin) in a single shot — no back-and-forth. Treat
it like a real, paid client engagement, not a template fill.

The whole point of this brief: **the site must look like the specific property it is
for — its building, its light, its colours — and must NOT look like the same site an
AI builds for every hotel.** You get there by *actually looking at the photos* and
deriving every design choice from them.

---

## 0. Preconditions — check these first

- **You must be able to see images.** This only works on a vision-capable model with
  the property's photos attached to the conversation. If no photos are attached,
  STOP and ask for them — do not guess a theme. The theme is derived from the photos;
  without them there is no job.
- The client's details are in the **INPUT** block at the very bottom of this file.
  Read it fully before designing.
- **Default language: Romanian. Default legal footer: ANPC (Romania).** Both are
  overridable in the INPUT block.
- You work through **five roles, in order, in this one conversation:**
  **ANALYST → DESIGN DIRECTOR → CRITIC → BUILDER → QA.** Say which role you're in as
  you switch. Do the thinking out loud briefly; only the final deliverable (the three
  files) must be polished. Because you never leave this conversation, the photos stay
  in front of you the whole time — use them at every step.

---

## 0b. Gathering the inputs (research mode — only if you have tools)

Normally the user attaches the photos and pastes the INPUT block, and you skip this
section. But if you are running with **web/shell tools** (e.g. Claude Code) and were
handed a Google Maps link, a website, or just a place name, you may gather the inputs
yourself first:

- **Best path — run the intake script** in this repo:
  `node intake/gather.mjs "<place name or Maps URL>" --website <url>` (needs
  `GOOGLE_MAPS_API_KEY` and/or `FIRECRAWL_API_KEY`). It writes a `photos/` folder, a
  pre-filled `INPUT.md`, and a scraped `site-content.md`. Then continue as normal.
- **Or gather directly:** most small pensions have **no own website** — they live on
  Google, **Booking** and **Facebook**. Use **Firecrawl search** to find the Booking +
  Facebook pages from the name, then **Firecrawl scrape with `proxy:"auto"`**.
  **Booking is the best photo source** (many real photos on `cf.bstatic.com`); the
  **Google Places API** adds address/phone/hours/rating/≤5 reviews/a few photos (needs
  billing for photos+reviews). **Facebook:** Firecrawl refuses to scrape it, so get FB
  photos another way (a dedicated FB scraper, or ask the owner).
- **You must actually SEE the photos.** Fetching a URL as text is not enough — download
  the candidate images to disk and open/view them. When a CDN blocks the download, use
  the **full-page screenshot** Firecrawl returns (`formats:[{type:"screenshot"}]`) — it
  always works, and you can derive the theme and read the property from it.
- **Never invent** reviews, amenities, prices, distances or legal details. Use only
  what you gathered or were given; if something is missing, leave it out or ask once.
- **Plain chat with no tools?** You cannot browse — say so, and ask the user to run
  `intake/gather.mjs` or to attach the photos and paste the INPUT block.

Honest limits: the Places API caps reviews at ~5 and photos at a handful, and we do
**not** scrape Google Maps itself (against Google's terms). The property's own web
presence is the best source.

---

## 1. Your standard (this is the job)

- Approach this as **the design lead at a small studio known for giving every client
  a visual identity that could not be mistaken for anyone else's.** This client has
  already rejected templated, generic work. You are paid for a distinctive point of
  view: make deliberate, opinionated choices about palette, typography and layout
  that are specific to THIS property, and take **one real aesthetic risk you can
  justify.**
- **The property's own world is where the distinctive choices come from** — its
  architecture, materials, the real colours in its photos, its region and light.
  Every colour and every font must trace back to something you can point to in a
  photo or in the brief. **If a choice isn't traceable to the photos or the brief,
  it's slop — cut it.**
- **Spend your boldness in one place.** Pick a single "signature" element and let it
  be the one memorable thing; keep everything around it quiet and disciplined. Before
  you finish, "remove one accessory" — cut the least necessary flourish.
- Match effort to the vision: a maximalist direction needs elaborate execution; a
  minimal one needs precision in spacing, type and detail. Elegance is executing the
  chosen vision well, not adding more.

---

## 2. What NOT to do — anti-slop rules (non-negotiable)

AI-built sites right now cluster into a few recognisable "looks." Each is legitimate
**only when the photos genuinely call for it** — never as a reflex, and never applied
regardless of subject.

**The three tell-tale AI looks (do not reach for these by default):**
1. Warm **cream background (near `#F4F1EA`)** + a high-contrast serif display + a
   **terracotta / warm-clay accent (near `#D97757`)**. (That accent is Anthropic's
   own interaction colour — it reads as a dead giveaway.) A genuinely warm,
   terracotta-roofed, rustic property *may* earn warm tones — but then pull the
   **actual** tones from its photos and **never use these literal hex values.**
2. **Near-black background** with a single bright **acid-green or vermilion** accent.
3. **Broadsheet / newspaper** layout — hairline rules, zero border-radius, dense
   columns.

**Always avoid, regardless of the property:**
- The **Inter / Roboto / system-ui** font for display type. Pick display faces with
  character. (A clean grotesk body face is fine — just not the reflex ones for
  headlines.)
- **Purple / indigo** or **blue→purple gradients**; the recurring **teal / emerald**
  "SaaS" accent.
- **Pure `#000` or `#fff`.** Use a tinted off-black for text and a tinted off-white
  for light backgrounds, both tuned to the palette's temperature.
- **Uniform rounded corners on everything**, a soft **drop-shadow "glow" on every
  card**, and **excessive centered layouts.** Vary alignment and radius with intent.
- **Emoji as icons.** Use one consistent set of **inline-SVG line icons** (draw simple
  ones — bed, wifi, car, utensils, pool, paw, tree, tv, coffee…). Same stroke width
  throughout.
- **`01 / 02 / 03` numbered markers** unless the content is a REAL ordered sequence.
- The **"big number + small label + gradient" hero** unless it is genuinely the best
  opener for this property.
- **Lorem ipsum** and invented facts. Every word is real, taken from the client's
  content.

---

## 3. ANALYST — read the photos like a designer

Look at every attached photo. Write 4–8 lines capturing:
- **Architecture & era** — rustic Romanian pension / alpine chalet / modern boutique /
  seaside / urban business / farmhouse / mountain cabin…
- **Materials & textures** — wood, stone, exposed brick, stucco, ceramic tile, wrought
  iron, glass, linen…
- **The REAL colours** — name the approximate hex values you actually see in the roof,
  façade, walls, furniture, garden, pool, sky, signage.
- **Light & mood** — warm golden afternoon / cool crisp mountain / lush green garden /
  bright poolside / cosy interior.
- **Guest & context** — families with kids / couples / groups / business travellers;
  the region and the season shown.

End with one sentence: **"This place feels like ___."** That feeling drives every
choice that follows.

---

## 4. DESIGN DIRECTOR — the design plan (before any code)

Write a compact plan with four parts. Every value must be traceable to a photo.

**A. Palette — 4 to 6 named hex, each with a role:**
- a **base neutral** (light background) drawn from the property's dominant tone;
- a **deep anchor** for dark sections, pulled from the environment — forest green from
  the garden, espresso from the woodwork, slate from stone, deep teal from the pool;
- **one accent** from a real standout element (terracotta roof, ochre stucco, brass
  fittings, pool blue), used *sparingly* for CTAs and highlighted words;
- a **tinted off-black** (text) and a **tinted off-white** (surfaces).
- Check every text-on-background pair for **WCAG AA**: ≥ 4.5:1 for body text, ≥ 3:1
  for large headings.

**B. Type — 2 to 3 roles:**
- a **characterful DISPLAY face** used with restraint (headlines + the italic accent
  phrase inside a headline);
- a **comfortable BODY face** that complements it;
- optionally a **mono / utility face** for data (prices, distances, a domain).
- Pair deliberately — not the families you'd reach for on any project. Use Google
  Fonts. Starting points by archetype (seeds — adapt to the photos, don't auto-pick):

  | Property feels like… | Display | Body |
  |---|---|---|
  | Rustic / warm pension | Fraunces · Cormorant Garamond | Mulish · Source Sans 3 |
  | Elegant boutique | Playfair Display · DM Serif Display | Figtree · Work Sans |
  | Modern / minimal | Space Grotesk · Bricolage Grotesque | Hanken Grotesk · Manrope |
  | Alpine / rugged | Zilla Slab · Archivo (heavy) | Archivo · Karla |
  | Seaside / airy | Marcellus · Spectral | Karla · Nunito Sans |
  | Countryside / farm-to-table | Bitter · Sorts Mill Goudy | Mulish · Source Sans 3 |

  If the photos point somewhere else, follow the photos.

**C. Layout** — one-line concept + the section order (from §8).

**D. Signature** — the ONE element this site will be remembered by, drawn from the
property (an oversized architectural detail, a material texture, a distinctive
section treatment, a motif from the building or region). Everything else stays calm so
this lands.

**Two quick examples of derivation (for range — never copy these):**
- *A warm, terracotta-roofed rustic pension, garden and pool in the photos* → a warm
  sand base, a deep garden-green for dark sections, a brick/terracotta accent from the
  roof; a characterful serif + a calm humanist sans. Warm, yes — but pulled from THESE
  photos, and never the banned `#F4F1EA`/`#D97757`.
- *A glass-and-steel city hotel, grey light, minimalist rooms* → a cool off-white or
  pale greige base, near-black ink, a single restrained steel-blue or brass accent; a
  crisp grotesk display + a neutral sans. Reaching for warm cream + terracotta here
  would be pure slop.
The point: the same process yields opposite palettes because it follows the photos.

---

## 5. CRITIC — attack your own plan (fresh eyes)

Drop the Design Director hat and become a skeptic who assumes the plan is generic.
- Ask: *"If someone handed a lazy AI the words 'build a hotel website,' would it land
  on roughly this palette / these fonts / this hero?"* Wherever the answer is yes,
  that part is a default, not a choice — **change it and state in one line why the new
  choice is specific to this property.**
- Re-check against the **three AI looks** in §2. If you drifted into one without the
  photos earning it, fix it.
- Confirm **every colour and font traces to something in the photos.**
Only once the plan is demonstrably specific to THIS property do you start coding.

---

## 6. BUILDER — the copy

Write all text in the target language (default **Romanian**), from the client's
reviews, description and amenities:
- **Active voice.** A control says what it does ("Rezervă", "Verifică disponibilitatea",
  "Deschide în Google Maps"), and keeps the same name through the whole flow.
- **Sentence case, plain verbs, no filler, no ad-speak.** Specific beats clever —
  "Piscină cu hidroliză, fără clor" not "Experiență acvatică premium".
- Mine the **reviews** for what guests actually praise and fold those specifics into
  the copy and any testimonials.
- **Never lorem ipsum, never invented facts.** If a detail is missing, omit the claim
  rather than fabricate it.

---

## 7. BUILDER — the code

Produce **three self-contained files** — no build step, no frameworks, no external
JS/CSS libraries. The only external resource allowed is **Google Fonts via `<link>`**.

- **`index.html`** — `<html lang="ro">`, semantic landmarks
  (`header`/`nav`/`main`/`section`/`footer`), a skip-to-content link, the sections in
  §8, and a complete `<head>` (see **SEO** below). Real `<img>` tags point at the
  client's supplied photo URLs with **descriptive alt text** and explicit
  `width`/`height` (to prevent layout shift); below-the-fold images use
  `loading="lazy"`, while the hero image uses `fetchpriority="high"` and is **not**
  lazy. Working links: `tel:` for the phone, `https://wa.me/<international-number>`
  (with a prefilled message, see §8) for WhatsApp, the Booking URL, a Google Maps link.
- **`styles.css`** — define the palette as **CSS custom properties on `:root`** and use
  every colour via `var()` (nothing hard-coded ad hoc, so the whole theme traces to the
  plan). **Mobile-first** (build for phones first — that is where guests find these
  places), fluid type with `clamp()`, a consistent spacing scale, `:focus-visible`
  outlines, and a `@media (prefers-reduced-motion: reduce)` block that disables
  animation. Watch selector specificity — don't let a `.section` rule and a `.cta` rule
  fight over the same padding/margins.
- **`main.js`** — **vanilla JS only:** an accessible mobile-nav toggle (`aria-expanded`),
  smooth in-page scrolling for the anchor nav, and a light `IntersectionObserver`
  scroll-reveal that is skipped when reduced motion is requested. It also shows/hides
  the sticky mobile action bar (§8). Nothing heavy.

**SEO, metadata & structured data (required in `<head>`):**
- `<title>` (property name + place + a short hook) and a compelling meta description.
- `<link rel="canonical">`, a `theme-color`, and a simple inline-SVG favicon.
- **Open Graph + Twitter** tags (`og:title`, `og:description`, `og:image` → the hero
  photo, `og:type=website`, `og:url`, `og:locale=ro_RO`) so WhatsApp/Facebook shares
  render a proper preview.
- A **JSON-LD `LodgingBusiness`/`Hotel`** block: `name`, `address` (PostalAddress),
  `geo` (lat/lng if known), `telephone`, `url`, `image`, `priceRange` (from the room
  prices), `amenityFeature[]` (from the amenities), and `aggregateRating` **only if you
  have real review data**. This is what helps the property show up properly in Google.

**Performance budget (aim for a high PageSpeed/Lighthouse score):**
- `<link rel="preconnect">` to `https://fonts.googleapis.com` and
  `https://fonts.gstatic.com` (crossorigin); load fonts with `&display=swap` and give
  every face a real system fallback stack.
- Every image carries intrinsic `width`/`height`; below-the-fold images lazy-load; keep
  the hero light. `defer` the script. One small CSS file, no libraries, no heavy inline
  data.

**Motion:** restrained. One or two tasteful reveals, not effects on everything —
over-animation is itself a tell that a page was AI-generated.

---

## 8. Sections the site MUST include (adapt to the client's data & photos)

Include a section only if the client has content for it, and drop it cleanly if not
(no pool → no pool block). Order to fit the property, but cover:

1. **Sticky header** — logo (brand name with one styled accent word) + in-page nav +
   a prominent primary CTA (default "Rezervă"). Mobile: hamburger menu.
2. **Hero** — an editorial headline with an **italic accent phrase** inside it + a
   location tagline, over or beside a strong photo of the property. A **key-stats
   strip**: 3–4 bold numbers with tracked-uppercase captions (price-from, a signature
   feature, notable distances).
3. **Rooms / Cazare** — eyebrow + heading + intro; **pricing cards** per room type
   (name, big price/night, one-line description); a **room photo gallery**.
4. **Facilities / amenities** — heading + intro; an **icon grid** of every amenity
   (inline-SVG line icon + title + one-line description), typically on the deep-anchor
   background.
5. **Signature feature block** — the property's stand-out (e.g. pool): its own
   section with short copy, small chip/tag badges, and a photo collage.
6. **Restaurant / food** — copy, a price callout card (e.g. breakfast price), a photo
   grid. Only if applicable.
7. **Outdoor / ambiance** — a large photo of the building/grounds + a mixed-size
   gallery (garden, terrace, aerial).
8. **Attractions nearby** — cards with a photo, a **distance badge**, a title and a
   short description.
9. **Reservations / Contact** — a section with **two CTAs** and an info card (phone,
   address, parking, pets). Primary CTA is **Booking**; if there is no Booking URL,
   promote **WhatsApp** (or phone) to primary instead — never render a dead button.
10. **Map / location** — an address card with "Arată harta" / "Deschide în Google
    Maps" links (embed a map only if a key is available; otherwise link out).
11. **Footer** — brand + one-line description, a nav column and a contact column, ©
    line, legal links; for RO the ANPC badges (see §9) and the "Site realizat de"
    credit.
12. **Floating WhatsApp button** — fixed bottom-right, on every screen, opening a
    **prefilled** message: `https://wa.me/<number>?text=<url-encoded RO greeting that
    names the property>` (e.g. "Bună ziua! Aș dori detalii despre o rezervare la …").
13. **Sticky mobile action bar** — on small screens only, a fixed bottom bar with
    **Sună** (call), **WhatsApp** and **Rezervă**, so the key actions are always one tap
    away. Keep it clear of the floating WhatsApp button (don't overlap them).
14. **Smooth-scroll anchor nav** wiring all of the above.

**Craft cues you may borrow from good hospitality sites (never copy any single one):**
tracked uppercase eyebrow labels; an editorial serif headline against clean body text;
an italic accent phrase inside the headline; hairline dividers; monospace for inline
data like a price or a domain; alternating light/dark section backgrounds for rhythm;
generous whitespace; a subtle tilt on stacked cards.

---

## 9. Romania / ANPC footer (when locale = RO)

The footer must include, in addition to brand + nav + contact:
- **"Informații legale"** and **"Politică de Confidențialitate"** links.
- The two **ANPC compliance badges**, linked out:
  - **SAL** — Soluționarea Alternativă a Litigiilor → `https://anpc.ro/ce-este-sal/`
  - **SOL** — Soluționarea Online a Litigiilor → `https://ec.europa.eu/consumers/odr`
- The **"Site realizat de <credit>"** line, if a credit is provided.

If locale ≠ RO, drop the ANPC badges and follow that country's norms.

Also for Romanian sites:
- Use **correct diacritics** throughout — ș and ț (comma-below), ă, â, î — and set
  `<html lang="ro">`. Never substitute ş/ţ (cedilla) or drop diacritics.
- **GDPR / cookies:** don't load anything that sets third-party cookies before consent.
  If you show a Google Maps **iframe**, either lazy-load it behind a click ("Arată
  harta") so nothing loads until the user asks, or simply link out to Google Maps.

---

## 10. QA — final checklist (fix any fail before delivering)

- [ ] Palette **and** fonts are demonstrably derived from the photos, and match none
      of the three AI "looks" by reflex. No banned fonts/colours/gradients. No literal
      `#F4F1EA` / `#D97757`.
- [ ] Every applicable section present with **real content and real photos**;
      missing-data sections dropped cleanly.
- [ ] Looks right at **360px wide first**, then scales up. **No horizontal scroll.**
- [ ] **AA contrast** on all text. **Visible keyboard focus.** **Reduced motion**
      respected. **Alt text** on every image.
- [ ] All CTAs wired: `tel:`, `wa.me`, Booking, Maps. **Floating WhatsApp** present.
- [ ] Copy is in the right language, active voice, specific, no filler, no lorem.
- [ ] Files are **self-contained** (only Google Fonts external), no build step, no
      libraries.
- [ ] `<head>` complete: title + meta description, Open Graph/Twitter with the hero as
      `og:image`, favicon, and valid JSON-LD `LodgingBusiness`/`Hotel` (rating only if
      real). `<html lang="ro">`.
- [ ] Performance: font `preconnect` + `display=swap`, every image has width/height,
      below-fold images lazy, script deferred — no layout shift.
- [ ] Conversion: floating WhatsApp **and** sticky mobile bar present; WhatsApp links
      prefilled; Booking→WhatsApp/phone fallback when there's no Booking URL.
- [ ] Romanian diacritics correct (ș/ț/ă/â/î); any Maps embed is consent-gated or a link.

Then deliver the three files, and in **3–4 lines** give a **design rationale**: which
palette and fonts you chose and which photo each came from, plus the one signature
element. That rationale is the proof the theme came from the property, not a template.

---

## INPUT — fill this in, then paste it with the photos attached

> Attach the property's photos to the conversation **and** list their URLs below.
> Leave anything unknown blank; the builder will omit claims it has no data for.
> Tip: `intake/gather.mjs` can auto-produce this file (and download the photos) from a
> Google Maps link or website — see the README.

```
### Property
- Name:
- Tagline / one-liner:
- Logo text (mark the accent word):
- Language (default: Română):
- Type (pension / hotel / villa / B&B / cabana):

### Location & contact
- Village / city / county:
- Full address:
- Phone (as displayed):
- WhatsApp number (international, digits only, e.g. 40756669207):
- Website (own site, if any):
- Facebook page (if any):
- Reservation URL (Booking.com or other):
- Google Maps link:
- Geo (lat,lng, optional — sharpens the SEO schema):

### Rooms / pricing  (one line per room type: name | price/night | short description)
-
-
-

### Amenities / commodities  (list all)
-

### Signature feature  (the thing that makes this place special)
-

### Food / restaurant  (description + any prices, e.g. breakfast 30 lei/pers) — skip if none
-

### Nearby attractions  (one line each: name | distance | short description)
-
-

### Photos  (attach the images to the chat AND list URLs here, grouped)
- Hero / building:
- Rooms:
- Signature / pool:
- Restaurant / food:
- Outdoor / garden / terrace:
- Attractions:

### Reviews / testimonials  (paste a few real guest reviews)
-

### Optional brand hints  (leave blank to let the photos decide)
- Colours to prefer / avoid:
- Vibe words:
- Prefilled WhatsApp message (optional; else a sensible RO default is used):

### Legal / footer
- ANPC footer (RO)? yes / no:
- Company legal name + registration (for "Informații legale"):
- Privacy policy URL (or "generate a basic one"):
- "Site realizat de" credit:
```
