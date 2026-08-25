---
name: hotel-website-oneshot
description: >-
  One-shot a complete, bespoke marketing website for a hotel, guesthouse, pension,
  B&B, villa or cazare from its PHOTOS, reviews, description and amenities. The theme
  (palette, typography, mood) is derived from the actual photos — never generic AI
  defaults. Outputs a self-contained multi-file static site (index.html + styles.css
  + main.js) plus the mandatory Romanian legal pages (privacy, cookies, terms) and a
  cookie-consent banner, mobile-first, no build step, no libraries. Use whenever asked to
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

**C. Layout** — the **Structure Read** from §8: the hero paradigm, the rooms treatment,
the facilities treatment, the gallery shape and the section order you have chosen for THIS
property, plus one line on what makes this composition specific to it. Not the default
skeleton, and not the same skeleton as the last site you built.

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

Produce the site as **multiple self-contained pages** — no build step, no frameworks,
no external JS/CSS libraries. The only external resource allowed is **Google Fonts via
`<link>`**. The files: `index.html`, `styles.css`, `main.js`, **plus the mandatory
legal pages** `politica-confidentialitate.html`, `politica-cookies.html`,
`termeni-si-conditii.html` (all sharing `styles.css`) — see §9. Never ship without them.

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

## 8. Compose it differently every time (anti-template rule), then cover the content

The numbered list below is a **content checklist** (what to cover), NOT a fixed visual
skeleton or a fixed order. The fastest way to make slop is to pour every property into the
same wireframe and only swap the colours. **Two Cadru sites must never share the same
skeleton.**

**The banned default skeleton.** If your page is shaping up as: a full-bleed hero photo
with the wordmark overlaid, then a row of 3 equal room cards, then a dark facilities band
of white chips, then a 1-big-plus-2-small bento gallery, then a split "De ce ___" section,
then a white map card, then the footer, STOP. That is the template, and the template is
the slop. Recompose before you write a line of code.

**Structure Read (state it before building).** One line: "Composing this as: `<hero
paradigm>` + `<rooms treatment>` + `<facilities treatment>` + `<gallery shape>`, ordered
`<order>`, because `<what about this property drives it>`." Drive it from the property's
size, type, signature, and the shape and quantity of its real photos, never from habit.

**Vary at least the hero paradigm and the rooms treatment between any two builds.** Pick a
different combination from these menus each time:
- **Hero:** (a) full-bleed photo, wordmark corner-locked; (b) split: wordmark + copy on
  one side, a photo on the other; (c) type-led: a large wordmark on a colour field pulled
  from the photos, a thin photo strip below; (d) offset collage: wordmark beside 2-3
  stacked photos; (e) quiet centred, for a small boutique. Do not reach for (a) every time.
- **Rooms / Cazare:** (a) 2-column zigzag with large photos; (b) a horizontal scroll of
  room pills; (c) one featured room + a compact list; (d) an asymmetric bento; (e) a plain
  table for a larger hotel. **Cell count equals the number of REAL room types, never
  forced to 3.**
- **Facilities:** (a) light inline icon+label rows; (b) a 2-column checklist; (c) a quiet
  grid on a light background; (d) the dark band of chips. Rotate. The dark-chip band is
  ONE option, not the house default.
- **Gallery:** shape it to the actual photos. A full-width strip, a masonry, a simple 2x2,
  or a single hero shot + a thumb row are all fine. Do not reuse the same bento mosaic
  every time.
- **Order:** reorder the sections to the property's story. Lead with the signature when it
  is the reason people come; put the map early for a hard-to-find cabin; a food-forward
  guesthouse can put the restaurant above the rooms.

**Drop the "De ce ___" split-header by default.** The "big headline left, small paragraph
right" split-header is a banned AI tell, and it is exactly where placeholder text has been
leaking ("split-section"). Keep a "why us" block only if you have real, specific reasons to
say, and then stack it (headline over body), never as a floating split.

**Demo mode (no real property yet).** If you have no real data or photos, say so plainly.
Then still vary the composition AND the invented content: do not reuse the same three room
names and the same six amenities on every demo. Use hotel-appropriate imagery (generated,
or clearly-neutral architectural/interior placeholders); never drop an unrelated stock
image (a deer, a highway, a rusty dashboard) into a labelled slot like "Camera dublă".

Now, composed per your Structure Read: include a section only if the client has content
for it, drop it cleanly if not (no pool, no pool block), and cover:

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
    line, and a **legal-links row**: Termeni și Condiții · Politică de Confidențialitate
    · Politică de Cookies · Informații legale (each linking to its page, §9). For RO,
    the ANPC **SAL + SOL** badges and the "Site realizat de" credit.
12. **Floating WhatsApp button** — fixed bottom-right, on every screen, opening a
    **prefilled** message: `https://wa.me/<number>?text=<url-encoded RO greeting that
    names the property>` (e.g. "Bună ziua! Aș dori detalii despre o rezervare la …").
13. **Sticky mobile action bar** — on small screens only, a fixed bottom bar with
    **Sună** (call), **WhatsApp** and **Rezervă**, so the key actions are always one tap
    away. Keep it clear of the floating WhatsApp button (don't overlap them).
14. **Smooth-scroll anchor nav** wiring all of the above.
15. **Cookie-consent banner** (RO/EU — see §9) — shown on first visit, blocks
    non-essential cookies/embeds until the visitor accepts; the choice is remembered.

**Craft cues you may borrow from good hospitality sites (never copy any single one):**
tracked uppercase eyebrow labels; an editorial serif headline against clean body text;
an italic accent phrase inside the headline; hairline dividers; monospace for inline
data like a price or a domain; alternating light/dark section backgrounds for rhythm;
generous whitespace; a subtle tilt on stacked cards.

---

## 9. Legal pages, cookies & ANPC (MANDATORY for RO)

A Romanian site is not finished without these. Generate them every time — never skip.

### Footer legal links
- A **legal-links row**: **Termeni și Condiții · Politică de Confidențialitate ·
  Politică de Cookies · Informații legale**, each pointing to its page (below).
- The two **ANPC compliance badges**, linked out:
  - **SAL** — Soluționarea Alternativă a Litigiilor → `https://anpc.ro/ce-este-sal/`
  - **SOL** — Soluționarea Online a Litigiilor → `https://ec.europa.eu/consumers/odr`
- The **"Site realizat de <credit>"** line, if a credit is provided.

### The three MANDATORY legal pages
Build three standalone pages that **share `styles.css`**, with a minimal header (logo →
back to home) and the same footer. Write them in Romanian, complete and specific to
this property; fill company data from the INPUT and leave a clear `[ … ]` placeholder
wherever a value is missing (denumire, CUI, sediu, e-mail). Date each: "Ultima
actualizare: <lună an>".

1. **`politica-confidentialitate.html` — Politică de Confidențialitate** (GDPR, Reg. UE
   2016/679). Cover: operatorul (denumire, sediu, CUI, e-mail); ce date colectăm (nume,
   telefon, e-mail — prin telefon/WhatsApp/Booking/formular — plus date tehnice/cookies);
   scopurile (rezervări, răspuns la solicitări); temeiul legal (consimțământ, contract,
   interes legitim); destinatari/împuterniciți (găzduire, Booking, Meta/WhatsApp,
   Google); durata stocării; **drepturile persoanei vizate** (acces, rectificare,
   ștergere, restricționare, opoziție, portabilitate, retragerea consimțământului);
   dreptul de a te adresa **ANSPDCP** (dataprotection.ro); securitatea datelor.
2. **`politica-cookies.html` — Politică de Cookies** (Legea 506/2004 + GDPR). Ce sunt
   cookie-urile; categoriile folosite (strict necesare; funcționale; analiză — Google;
   terți — Booking, WhatsApp, hărți); rolul consimțământului; cum pot fi gestionate/
   dezactivate din browser. Keep it consistent with the embeds the site actually uses.
3. **`termeni-si-conditii.html` — Termeni și Condiții.** Obiectul (site informativ de
   prezentare); rezervările se fac prin Booking/telefon/WhatsApp, prețurile și
   disponibilitatea se pot modifica; proprietate intelectuală (texte, imagini);
   limitarea răspunderii; legea aplicabilă (română) + ANPC (SAL/SOL); modificarea
   termenilor; date de contact.

Never invent registration numbers — use the INPUT's values or `[ … ]`. In your delivery
notes, tell the owner to review these pages and fill any placeholder before going live
(a quick check by a specialist is recommended).

### Cookie-consent banner (mandatory — RO/EU ePrivacy)
- On first visit, show a small banner: short text + a link to the Cookie Policy +
  **"Accept"** and **"Refuz"** buttons (equally prominent). Remember the choice in
  `localStorage`; don't nag on every page.
- **Nothing that sets a non-essential / third-party cookie may load before consent** —
  no analytics, and the Google **Maps iframe** stays behind a click ("Arată harta") or
  is a plain link-out until the visitor accepts. Strictly-necessary only, by default.

### Correct Romanian
Proper diacritics throughout — ș and ț (comma-below), ă, â, î; `<html lang="ro">`.
Never substitute ş/ţ (cedilla) or drop diacritics.

If locale ≠ RO: keep the three pages **and** the cookie banner (GDPR applies EU-wide),
drop the RO-specific ANPC badges, and follow that country's norms.

---

## 10. QA — final checklist (fix any fail before delivering)

- [ ] Palette **and** fonts are demonstrably derived from the photos, and match none
      of the three AI "looks" by reflex. No banned fonts/colours/gradients. No literal
      `#F4F1EA` / `#D97757`.
- [ ] **Structure is not the default skeleton.** The Structure Read was stated; the hero
      paradigm and the rooms treatment differ from the last site built; the page is NOT
      (full-bleed hero + 3 room cards + dark facility chips + 1-big-2-small bento + split
      "De ce" + map card). No two Cadru sites share a wireframe.
- [ ] **No leaked placeholders or scaffolding text** ("split-section", "lorem", a bracket
      note, a stray class name) anywhere visible. Every string is real Romanian, re-read
      end to end; on a demo, the room names and amenities are not the same reused set.
- [ ] **Hero text is legible:** headline and subtitle sit on enough scrim/contrast (AA),
      do not overlap each other, are not clipped by the image edge, and the subtitle is
      not cut off.
- [ ] **Every photo is the property's own and in the right slot** (a room card shows a
      room, the gallery shows this place). No unrelated stock in a labelled slot; on a
      demo, hotel-appropriate imagery only.
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
- [ ] **Legal pages present + linked**: `politica-confidentialitate.html`,
      `politica-cookies.html`, `termeni-si-conditii.html` — real RO content, company data
      or clear `[ … ]` placeholders, footer links wired, ANPC SAL/SOL badges present.
- [ ] **Cookie-consent banner** on first visit (Accept/Refuz), choice remembered; no
      non-essential cookie or embed (incl. the Maps iframe) loads before consent.

Then deliver all the files, and in **3–4 lines** give a **design rationale**: which
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

### Legal / footer  (used to generate the mandatory legal pages — §9)
- ANPC footer (RO)? yes / no:
- Entitate juridică (SRL / PFA / II / persoană fizică):
- Denumire legală + CUI/CIF + nr. Reg. Com. (J…) — for "Informații legale":
- Sediu social / adresă legală:
- E-mail de contact pentru solicitări GDPR:
- "Site realizat de" credit:
```
