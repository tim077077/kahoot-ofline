#!/usr/bin/env node
// intake/gather.mjs
//
// Auto-gather a lodging property's facts, reviews and photos for the
// hotel-website meta prompt (../SKILL.md). Zero dependencies — needs Node 18+
// (uses the built-in global fetch).
//
// It pulls from up to two complementary sources, using whichever API key you set:
//   • Google Places API (New)  → facts, up to 5 reviews, and a few photos, from a
//                                Maps link or a place name. (GOOGLE_MAPS_API_KEY)
//   • Firecrawl                → the richer text + real photos from the property's
//                                own website / Booking / Facebook page, rendering
//                                JavaScript and getting past anti-bot walls.
//                                (FIRECRAWL_API_KEY)
//
// It writes a folder with the downloaded photos, any scraped page text, and a
// pre-filled INPUT.md you can paste under SKILL.md.
//
// Usage:
//   node intake/gather.mjs "<place name or Google Maps URL>" [options]
//
// Options:
//   --website URL     Property's own site   (scraped with Firecrawl if key set)
//   --booking URL     Booking.com listing   (scraped with Firecrawl if key set)
//   --fb URL          Facebook page         (scraped with Firecrawl if key set)
//   --out DIR         Output directory (default: ./intake-output)
//   --max-photos N    Max Google photos to download (default: 10)
//   --lang CODE       Places languageCode (default: ro)
//   --region CODE     Places regionCode   (default: RO)
//   -h, --help
//
// Env (each optional; the matching source is skipped with a warning if unset):
//   GOOGLE_MAPS_API_KEY   Places API (New) key
//   FIRECRAWL_API_KEY     Firecrawl key
//
// Honest limits: the Places API returns only up to 5 reviews and a limited photo
// set; we do NOT scrape Google Maps itself (against Google's ToS and unreliable).
// The property's own web presence, via Firecrawl, is the best source of authentic
// content and photos.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PLACES = 'https://places.googleapis.com/v1';
const FIRECRAWL = 'https://api.firecrawl.dev/v2';
const DETAILS_FIELD_MASK = [
  'id', 'displayName', 'formattedAddress', 'location', 'nationalPhoneNumber',
  'internationalPhoneNumber', 'websiteUri', 'googleMapsUri', 'rating',
  'userRatingCount', 'reviews', 'photos', 'regularOpeningHours', 'priceLevel',
].join(',');

const HELP = `
gather.mjs — auto-gather a property's facts, reviews and photos for SKILL.md

  node intake/gather.mjs "<place name or Google Maps URL>" [options]

Options:
  --website URL     Property's own site   (Firecrawl)
  --booking URL     Booking.com listing   (Firecrawl)
  --fb URL          Facebook page         (Firecrawl)
  --out DIR         Output directory (default: ./intake-output)
  --max-photos N    Max Google photos to download (default: 10)
  --lang CODE       Places languageCode (default: ro)
  --region CODE     Places regionCode   (default: RO)
  -h, --help

Env:
  GOOGLE_MAPS_API_KEY   Places API (New) key   (Maps facts + <=5 reviews + photos)
  FIRECRAWL_API_KEY     Firecrawl key          (own site / Booking / FB scraping)

Example:
  GOOGLE_MAPS_API_KEY=... FIRECRAWL_API_KEY=... \\
    node intake/gather.mjs "Pensiunea Beauty, Cicir, Arad" --website https://pensiuneabeauty.ro
`;

function parseArgs(argv) {
  const args = { query: '', website: '', booking: '', fb: '', out: './intake-output',
    maxPhotos: 10, lang: 'ro', region: 'RO', help: false };
  const withValue = { '--website': 'website', '--booking': 'booking', '--fb': 'fb',
    '--out': 'out', '--max-photos': 'maxPhotos', '--lang': 'lang', '--region': 'region' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { args.help = true; }
    else if (withValue[a]) { args[withValue[a]] = argv[++i] ?? ''; }
    else if (!a.startsWith('-') && !args.query) { args.query = a; }
  }
  args.maxPhotos = Number(args.maxPhotos) || 10;
  return args;
}

const slugify = (s) => (s || 'property').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').slice(0, 60) || 'property';

const toWhatsApp = (intl) => (intl || '').replace(/[^\d]/g, '');

const extFromContentType = (ct) => ct?.includes('png') ? 'png'
  : ct?.includes('webp') ? 'webp' : ct?.includes('gif') ? 'gif' : 'jpg';

async function fetchImage(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, ext: extFromContentType(res.headers.get('content-type') || '') };
}

// ---- Google Places (New) ------------------------------------------------------

async function resolveQuery(input) {
  // Returns a text query string for Places Text Search.
  if (!/^https?:\/\//i.test(input)) return input; // already a name
  let finalUrl = input;
  try {
    const r = await fetch(input, { redirect: 'follow' });
    finalUrl = r.url || input;
    try { await r.body?.cancel(); } catch { /* ignore */ }
  } catch { /* keep original */ }
  const nameMatch = finalUrl.match(/\/maps\/place\/([^/@]+)/);
  if (nameMatch) return decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ');
  const qMatch = finalUrl.match(/[?&]q=([^&]+)/);
  if (qMatch) return decodeURIComponent(qMatch[1]).replace(/\+/g, ' ');
  return ''; // couldn't extract a searchable name
}

async function placesTextSearch(query, key, { lang, region }) {
  const res = await fetch(`${PLACES}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify({ textQuery: query, languageCode: lang, regionCode: region }),
  });
  if (!res.ok) throw new Error(`Text Search HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.places?.[0]?.id || null;
}

async function placeDetails(placeId, key, { lang }) {
  const res = await fetch(`${PLACES}/places/${encodeURIComponent(placeId)}?languageCode=${lang}`, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': DETAILS_FIELD_MASK },
  });
  if (!res.ok) throw new Error(`Place Details HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function downloadPlacePhotos(photos, dir, max, key) {
  const files = [];
  for (const p of (photos || []).slice(0, max)) {
    const n = String(files.length + 1).padStart(2, '0');
    try {
      const { buf, ext } = await fetchImage(`${PLACES}/${p.name}/media?maxWidthPx=1600&key=${key}`);
      const file = `gmaps-${n}.${ext}`;
      await writeFile(join(dir, file), buf);
      files.push(file);
    } catch (e) { console.warn(`  ! photo ${n} failed: ${e.message}`); }
  }
  return files;
}

// ---- Firecrawl ----------------------------------------------------------------

async function firecrawlScrape(url, key) {
  const res = await fetch(`${FIRECRAWL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      url,
      formats: [{ type: 'markdown' }, { type: 'links' }, { type: 'rawHtml' }],
      onlyMainContent: true, timeout: 60000,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.data || {};
}

function extractImageUrls(rawHtml, markdown, baseUrl) {
  const urls = new Set();
  const push = (u) => {
    if (!u || u.startsWith('data:')) return;
    try { urls.add(new URL(u, baseUrl).href); } catch { /* skip bad url */ }
  };
  for (const m of (rawHtml || '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of (markdown || '').matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) push(m[1]);
  return [...urls].filter((u) => !/\.svg(\?|$)/i.test(u) && /^https?:/i.test(u));
}

async function scrapeSite(label, url, key, dir, startIndex) {
  console.log(`Firecrawl: scraping ${label} — ${url}`);
  const data = await firecrawlScrape(url, key);
  const imgUrls = extractImageUrls(data.rawHtml, data.markdown, url).slice(0, 20);
  const files = [];
  let i = startIndex;
  for (const u of imgUrls) {
    const n = String(++i).padStart(2, '0');
    try {
      const { buf, ext } = await fetchImage(u);
      const file = `site-${n}.${ext}`;
      await writeFile(join(dir, file), buf);
      files.push(file);
    } catch (e) { console.warn(`  ! site image ${n} failed: ${e.message}`); }
  }
  return { markdown: data.markdown || '', files, nextIndex: i };
}

// ---- INPUT.md assembly --------------------------------------------------------

function buildInputMd(d, { photoFiles, siteFiles, hasSiteContent, sources }) {
  const name = d?.displayName?.text || '';
  const intl = d?.internationalPhoneNumber || '';
  const reviews = (d?.reviews || []).map((r) => {
    const t = (r.text?.text || '').replace(/\s+/g, ' ').trim();
    const who = r.authorAttribution?.displayName || 'Oaspete';
    const stars = r.rating ? ` (${r.rating}★)` : '';
    return t ? `- "${t}" — ${who}${stars}` : null;
  }).filter(Boolean);
  const hours = d?.regularOpeningHours?.weekdayDescriptions || [];
  const allPhotos = [...photoFiles, ...siteFiles];

  return `# Auto-gathered input — ${name || 'property'}

> Produced by intake/gather.mjs from: ${sources.join(', ') || 'n/a'}.
> Photos downloaded to ./photos/ (attach that folder to the AI). Review everything
> and fill the blanks (« … ») — the script leaves rooms/prices/amenities/attractions
> for you, since Google does not provide them reliably.${hasSiteContent ? `
> Rich content was scraped to ./site-content.md — mine it for rooms, prices,
> amenities and attractions.` : ''}

\`\`\`
### Property
- Name: ${name}
- Tagline / one-liner: « scrie o frază scurtă »
- Logo text (mark the accent word): ${name}
- Language (default: Română): Română
- Type (pension / hotel / villa / B&B / cabana): «  »

### Location & contact
- Village / city / county: «  »
- Full address: ${d?.formattedAddress || ''}
- Phone (as displayed): ${d?.nationalPhoneNumber || ''}
- WhatsApp number (international, digits only): ${toWhatsApp(intl)}
- Reservation URL (Booking.com or other): «  »
- Google Maps link: ${d?.googleMapsUri || ''}
- Geo (lat,lng): ${d?.location ? `${d.location.latitude},${d.location.longitude}` : ''}

### Rooms / pricing  (name | price/night | short description)
- «  »

### Amenities / commodities
- «  »

### Signature feature
- «  »

### Food / restaurant
- «  »

### Nearby attractions  (name | distance | short description)
- «  »

### Photos  (downloaded to ./photos/ — attach the folder, sort into sections)
- Hero / building: « pick from ./photos/ »
- Rooms: « pick from ./photos/ »
- Signature / pool: « pick from ./photos/ »
- Restaurant / food: « pick from ./photos/ »
- Outdoor / garden / terrace: « pick from ./photos/ »
- Attractions: « pick from ./photos/ »
- All downloaded files: ${allPhotos.join(', ') || '(none)'}

### Reviews / testimonials  (from Google — up to 5)
${reviews.length ? reviews.join('\n') : '- « lipește recenzii reale »'}

### Google rating
- ${d?.rating ? `${d.rating} / 5 din ${d.userRatingCount || '?'} recenzii` : '«  »'}

### Opening hours (from Google)
${hours.length ? hours.map((h) => `- ${h}`).join('\n') : '- «  »'}

### Optional brand hints  (leave blank to let the photos decide)
- Colours to prefer / avoid:
- Vibe words:

### Legal / footer
- ANPC footer (RO)? yes / no: yes
- Company legal name + registration (for "Informații legale"): «  »
- Privacy policy URL (or "generate a basic one"): generate a basic one
- "Site realizat de" credit: «  »
\`\`\`
`;
}

// ---- main ---------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); process.exit(0); }
  if (!args.query && !args.website && !args.booking && !args.fb) {
    console.log(HELP); process.exit(1);
  }

  const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const fcKey = process.env.FIRECRAWL_API_KEY;
  if (!gmapsKey && !fcKey) {
    console.error('No API keys set. Set GOOGLE_MAPS_API_KEY and/or FIRECRAWL_API_KEY '
      + '(see intake/.env.example). Nothing to gather.');
    process.exit(1);
  }
  if (args.query && !gmapsKey) console.warn('! GOOGLE_MAPS_API_KEY not set — skipping Google Places (Maps facts/reviews/photos).');
  if ((args.website || args.booking || args.fb) && !fcKey) console.warn('! FIRECRAWL_API_KEY not set — skipping website/Booking/Facebook scraping.');

  const sources = [];
  let details = null;
  let photoFiles = [];
  const outRootSlug = slugify(args.query || args.website || 'property');
  const outDir = join(args.out, outRootSlug);
  const photosDir = join(outDir, 'photos');
  await mkdir(photosDir, { recursive: true });

  // Google Places
  if (args.query && gmapsKey) {
    try {
      const query = await resolveQuery(args.query);
      if (!query) throw new Error('could not derive a searchable place name from the input');
      console.log(`Places: searching "${query}"`);
      const placeId = await placesTextSearch(query, gmapsKey, args);
      if (!placeId) throw new Error('no place found');
      details = await placeDetails(placeId, gmapsKey, args);
      console.log(`Places: found "${details.displayName?.text}" (${details.userRatingCount || 0} reviews)`);
      photoFiles = await downloadPlacePhotos(details.photos, photosDir, args.maxPhotos, gmapsKey);
      console.log(`Places: downloaded ${photoFiles.length} photo(s), ${details.reviews?.length || 0} review(s).`);
      sources.push('Google Places');
    } catch (e) { console.warn(`! Places step failed: ${e.message}`); }
  }

  // Firecrawl (website preferred; also details.websiteUri if not supplied)
  const siteTargets = [];
  const website = args.website || details?.websiteUri;
  if (website) siteTargets.push(['website', website]);
  if (args.booking) siteTargets.push(['Booking', args.booking]);
  if (args.fb) siteTargets.push(['Facebook', args.fb]);

  let siteFiles = [];
  let siteMarkdown = '';
  if (siteTargets.length && fcKey) {
    let idx = 0;
    for (const [label, url] of siteTargets) {
      try {
        const r = await scrapeSite(label, url, fcKey, photosDir, idx);
        idx = r.nextIndex;
        siteFiles = siteFiles.concat(r.files);
        if (r.markdown) siteMarkdown += `\n\n<!-- ===== ${label}: ${url} ===== -->\n\n${r.markdown}`;
      } catch (e) { console.warn(`! Firecrawl (${label}) failed: ${e.message}`); }
    }
    if (siteFiles.length) console.log(`Firecrawl: downloaded ${siteFiles.length} site image(s).`);
    if (siteMarkdown) { await writeFile(join(outDir, 'site-content.md'), siteMarkdown.trim() + '\n'); }
    if (website) sources.push('own site');
    if (args.booking) sources.push('Booking');
    if (args.fb) sources.push('Facebook');
  }

  const inputMd = buildInputMd(details, {
    photoFiles, siteFiles, hasSiteContent: !!siteMarkdown, sources,
  });
  await writeFile(join(outDir, 'INPUT.md'), inputMd);

  console.log('\n─────────────────────────────────────────────');
  console.log(`Done. Output in: ${outDir}`);
  console.log(`  • photos/          ${photoFiles.length + siteFiles.length} image(s)`);
  console.log(`  • INPUT.md         pre-filled input form`);
  if (siteMarkdown) console.log(`  • site-content.md  scraped page text to mine`);
  console.log('\nNext steps:');
  console.log('  1) Open a vision-capable AI and ATTACH every image in photos/.');
  console.log('  2) Paste the contents of SKILL.md.');
  console.log('  3) Paste INPUT.md, fill the « … » blanks, and send.');
  if (!details) console.log('\n(Heads-up: no Google data — INPUT.md has mostly blanks to fill.)');
}

main().catch((e) => { console.error(`Fatal: ${e.message}`); process.exit(1); });
