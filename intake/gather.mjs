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

With a Firecrawl key, the Booking.com and Facebook pages are found automatically from
the name (via Firecrawl search) — you don't need to supply them. A full-page
screenshot of every source is saved too, so the theme can be derived even when a CDN
blocks direct photo downloads.

Options:
  --booking URL     Booking.com listing   (else auto-discovered)
  --facebook URL    Facebook page         (else auto-discovered; scraped via mbasic)
  --website URL     Property's own site, if it has one
  --no-search       Don't auto-discover Booking/Facebook; use only URLs you pass
  --out DIR         Output directory (default: ./intake-output)
  --max-photos N    Max Google photos to download (default: 10)
  --lang CODE       Places languageCode (default: ro)
  --region CODE     Places regionCode   (default: RO)
  -h, --help

Env:
  GOOGLE_MAPS_API_KEY   Places API (New) key   (Maps facts + <=5 reviews + photos)
  FIRECRAWL_API_KEY     Firecrawl key          (Booking / Facebook / website + search)

Example:
  GOOGLE_MAPS_API_KEY=... FIRECRAWL_API_KEY=... \\
    node intake/gather.mjs "Pensiunea Flora, Cicir, Arad"
`;

function parseArgs(argv) {
  const args = { query: '', website: '', booking: '', fb: '', facebook: '', out: './intake-output',
    maxPhotos: 10, lang: 'ro', region: 'RO', noSearch: false, help: false };
  const withValue = { '--website': 'website', '--booking': 'booking', '--fb': 'facebook',
    '--facebook': 'facebook', '--out': 'out', '--max-photos': 'maxPhotos', '--lang': 'lang',
    '--region': 'region' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { args.help = true; }
    else if (a === '--no-search') { args.noSearch = true; }
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
  // Returns { query, lat, lng } for Places Text Search. The coordinates matter: a
  // name like "Pensiunea Flora" exists in several towns, so we bias the search to the
  // pin in the URL, otherwise Text Search can return a same-named place elsewhere.
  if (!/^https?:\/\//i.test(input)) return { query: input };
  let finalUrl = input;
  try {
    const r = await fetch(input, { redirect: 'follow' });
    finalUrl = r.url || input;
    try { await r.body?.cancel(); } catch { /* ignore */ }
  } catch { /* keep original */ }
  // Prefer the pin (!3d<lat>!4d<lng>), fall back to the map centre (@lat,lng).
  const coord = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    || finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const geo = coord ? { lat: Number(coord[1]), lng: Number(coord[2]) } : {};
  const nameMatch = finalUrl.match(/\/maps\/place\/([^/@]+)/);
  if (nameMatch) return { query: decodeURIComponent(nameMatch[1]).replace(/\+/g, ' '), ...geo };
  const qMatch = finalUrl.match(/[?&]q=([^&]+)/);
  if (qMatch) return { query: decodeURIComponent(qMatch[1]).replace(/\+/g, ' '), ...geo };
  return { query: '', ...geo };
}

async function placesTextSearch(query, key, { lang, region, lat, lng }) {
  const body = { textQuery: query, languageCode: lang, regionCode: region };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 2000 } };
  }
  const res = await fetch(`${PLACES}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
    },
    body: JSON.stringify(body),
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

async function firecrawlScrape(url, key, opts = {}) {
  const formats = [{ type: 'markdown' }, { type: 'links' }, { type: 'rawHtml' }];
  if (opts.screenshot) formats.push({ type: 'screenshot', fullPage: false });
  const body = {
    url, formats,
    onlyMainContent: opts.onlyMainContent ?? false,
    proxy: 'auto', // residential proxies with auto-escalation — gets past most blocks
    waitFor: opts.waitFor ?? 3500,
    timeout: 120000,
  };
  if (opts.actions) body.actions = opts.actions;
  const res = await fetch(`${FIRECRAWL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).data || {};
}

async function firecrawlSearch(query, key, limit = 6) {
  const res = await fetch(`${FIRECRAWL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, limit, sources: ['web'] }),
  });
  if (!res.ok) throw new Error(`Firecrawl search HTTP ${res.status}`);
  return ((await res.json()).data?.web || []).map((r) => r.url).filter(Boolean);
}

// Booking serves photos from cf.bstatic.com; normalise any size folder to a big one.
const normalizeBstatic = (u) => u.replace(/\/images\/hotel\/[a-z0-9]+\//i, '/images/hotel/max1024x768/');
// Facebook's normal site is a JS/login wall; mbasic is server-rendered HTML.
const toMbasic = (u) => u.replace(/^https?:\/\/(www\.|m\.|web\.)?facebook\.com/i, 'https://mbasic.facebook.com');

function extractImageUrls(rawHtml, markdown, baseUrl) {
  const urls = new Set();
  const push = (u) => {
    if (!u || u.startsWith('data:')) return;
    let abs; try { abs = new URL(u, baseUrl).href; } catch { return; }
    if (/bstatic\.com\/xdata\/images\/hotel\//i.test(abs)) abs = normalizeBstatic(abs);
    urls.add(abs);
  };
  for (const m of (rawHtml || '').matchAll(/<img[^>]+(?:src|data-src|data-lazy)=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of (rawHtml || '').matchAll(/https:\/\/cf\.bstatic\.com\/xdata\/images\/hotel\/[a-z0-9]+\/[0-9]+\.(?:jpe?g|webp)/gi)) push(m[0]);
  for (const m of (markdown || '').matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) push(m[1]);
  const seen = new Set();
  return [...urls].filter((u) => {
    if (!/^https?:/i.test(u) || /\.svg(\?|$)/i.test(u)) return false;
    if (/sprite|icon|logo|flag|avatar|placeholder|1x1|blank|badge/i.test(u)) return false;
    const id = (u.match(/\/(\d{6,})\.(?:jpe?g|webp)/) || [])[1]; // dedupe Booking by image id
    if (id) { if (seen.has(id)) return false; seen.add(id); }
    return true;
  });
}

async function downloadImages(urls, dir, prefix, startIndex) {
  const files = []; const failed = [];
  let i = startIndex;
  for (const u of urls) {
    const n = String(++i).padStart(2, '0');
    try {
      const { buf, ext } = await fetchImage(u);
      if (buf.length < 3000) throw new Error('too small'); // placeholder / blocked
      const file = `${prefix}-${n}.${ext}`;
      await writeFile(join(dir, file), buf);
      files.push(file);
    } catch { failed.push(u); }
  }
  return { files, failed, nextIndex: i };
}

async function saveScreenshot(data, dir, label) {
  if (!data.screenshot) return null;
  try {
    const { buf } = await fetchImage(data.screenshot);
    const file = `screenshot-${label}.png`;
    await writeFile(join(dir, file), buf);
    return file;
  } catch { return null; }
}

async function scrapeSource(label, url, key, dir, startIndex, isBooking) {
  console.log(`Firecrawl: scraping ${label} — ${url}`);
  const actions = isBooking ? [
    { type: 'wait', milliseconds: 2500 },
    { type: 'scroll', direction: 'down' },
    { type: 'scroll', direction: 'down' },
    { type: 'wait', milliseconds: 1500 },
  ] : undefined;
  let data;
  try {
    data = await firecrawlScrape(url, key, { screenshot: true, waitFor: 4000, actions });
  } catch {
    data = await firecrawlScrape(url, key, { screenshot: true, waitFor: 4000 }); // retry w/o actions
  }
  const remoteUrls = extractImageUrls(data.rawHtml, data.markdown, url).slice(0, 30);
  const { files, failed, nextIndex } = await downloadImages(remoteUrls, dir, 'photo', startIndex);
  const screenshotFile = await saveScreenshot(data, dir, slugify(label));
  return { markdown: data.markdown || '', files, remoteUrls, failed, screenshotFile, nextIndex };
}

// ---- INPUT.md assembly --------------------------------------------------------

function buildInputMd(d, { photoFiles, siteFiles, hasSiteContent, sources,
  bookingUrl, fbUrl, screenshots = [], remoteCount = 0 }) {
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
> amenities and attractions.` : ''}${screenshots.length ? `
> Full-page screenshots (${screenshots.join(', ')}) are in ./photos/ — attach them so
> the AI can SEE the property even for photos that didn't download here.` : ''}${remoteCount ? `
> ./photo-urls.txt lists ${remoteCount} image URL(s). If some didn't download (a CDN
> blocked this machine), on your own machine run:
>   cd photos && xargs -n1 curl -sLO < ../photo-urls.txt` : ''}

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
- Website (own site, if any): «  »
- Facebook page (if any): ${fbUrl || '«  »'}
- Reservation URL (Booking.com or other): ${bookingUrl || '«  »'}
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
  if (!args.query && !args.website && !args.booking && !args.facebook) {
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
  if (!fcKey) console.warn('! FIRECRAWL_API_KEY not set — skipping Booking/Facebook/website scraping + discovery.');

  const sources = [];
  let details = null;
  let photoFiles = [];

  // Resolve a clean name (and coords) early — used for the folder and the search.
  let resolved = { query: args.query };
  if (args.query) { try { resolved = await resolveQuery(args.query); } catch { /* keep raw */ } }

  const outRootSlug = slugify(resolved.query || args.website || 'property');
  const outDir = join(args.out, outRootSlug);
  const photosDir = join(outDir, 'photos');
  await mkdir(photosDir, { recursive: true });

  // Google Places
  if (args.query && gmapsKey) {
    try {
      if (!resolved.query) throw new Error('could not derive a searchable place name from the input');
      console.log(`Places: searching "${resolved.query}"${resolved.lat ? ` near ${resolved.lat},${resolved.lng}` : ''}`);
      const placeId = await placesTextSearch(resolved.query, gmapsKey, { ...args, lat: resolved.lat, lng: resolved.lng });
      if (!placeId) throw new Error('no place found');
      details = await placeDetails(placeId, gmapsKey, args);
      console.log(`Places: found "${details.displayName?.text}" (${details.userRatingCount || 0} reviews)`);
      photoFiles = await downloadPlacePhotos(details.photos, photosDir, args.maxPhotos, gmapsKey);
      console.log(`Places: downloaded ${photoFiles.length} photo(s), ${details.reviews?.length || 0} review(s).`);
      sources.push('Google Places');
    } catch (e) { console.warn(`! Places step failed: ${e.message}`); }
  }

  // Firecrawl: discover + scrape Booking / Facebook / own site
  let siteFiles = [];
  let siteMarkdown = '';
  let allRemoteUrls = [];
  const screenshots = [];
  let bookingUrl = '';
  let fbUrl = '';

  if (fcKey) {
    let booking = args.booking;
    let facebook = args.facebook;
    const website = args.website || details?.websiteUri;
    const searchName = [resolved.query, details?.formattedAddress].filter(Boolean).join(' ').trim()
      || args.query;

    if (!args.noSearch && searchName && (!booking || !facebook)) {
      try {
        if (!booking) {
          const hits = await firecrawlSearch(`${searchName} booking.com`, fcKey);
          booking = hits.find((u) => /booking\.com\/hotel\//i.test(u)) || '';
          if (booking) console.log(`Discovered Booking: ${booking}`);
        }
        if (!facebook) {
          const hits = await firecrawlSearch(`${searchName} facebook`, fcKey);
          facebook = hits.find((u) => /facebook\.com/i.test(u) && !/\/(sharer|login|photo\.php)/i.test(u)) || '';
          if (facebook) console.log(`Discovered Facebook: ${facebook}`);
        }
      } catch (e) { console.warn(`! discovery search failed: ${e.message}`); }
    }
    bookingUrl = booking; fbUrl = facebook;

    const targets = [];
    if (website) targets.push(['website', website, false]);
    if (booking) targets.push(['Booking', booking, true]);
    if (facebook) targets.push(['Facebook', toMbasic(facebook), false]);

    let idx = 0;
    for (const [label, url, isBooking] of targets) {
      try {
        const r = await scrapeSource(label, url, fcKey, photosDir, idx, isBooking);
        idx = r.nextIndex;
        siteFiles = siteFiles.concat(r.files);
        allRemoteUrls = allRemoteUrls.concat(r.remoteUrls);
        if (r.screenshotFile) screenshots.push(r.screenshotFile);
        if (r.markdown) siteMarkdown += `\n\n<!-- ===== ${label}: ${url} ===== -->\n\n${r.markdown}`;
        console.log(`  ${label}: ${r.files.length} photo(s) saved`
          + `, ${r.remoteUrls.length} URL(s) found`
          + `${r.screenshotFile ? ', screenshot ✓' : ''}`
          + `${r.failed.length ? `, ${r.failed.length} blocked here (see photo-urls.txt)` : ''}`);
        if (r.files.length || r.markdown || r.screenshotFile) sources.push(label);
      } catch (e) { console.warn(`! Firecrawl (${label}) failed: ${e.message}`); }
    }
    if (siteMarkdown) await writeFile(join(outDir, 'site-content.md'), siteMarkdown.trim() + '\n');
    if (allRemoteUrls.length) {
      allRemoteUrls = [...new Set(allRemoteUrls)];
      await writeFile(join(outDir, 'photo-urls.txt'), allRemoteUrls.join('\n') + '\n');
    }
  }

  const inputMd = buildInputMd(details, {
    photoFiles, siteFiles, hasSiteContent: !!siteMarkdown, sources,
    bookingUrl, fbUrl, screenshots, remoteCount: allRemoteUrls.length,
  });
  await writeFile(join(outDir, 'INPUT.md'), inputMd);

  console.log('\n─────────────────────────────────────────────');
  console.log(`Done. Output in: ${outDir}`);
  console.log(`  • photos/          ${photoFiles.length + siteFiles.length} image(s)`
    + `${screenshots.length ? ` + ${screenshots.length} screenshot(s)` : ''}`);
  console.log(`  • INPUT.md         pre-filled input form`);
  if (siteMarkdown) console.log(`  • site-content.md  scraped page text to mine`);
  if (allRemoteUrls.length) console.log(`  • photo-urls.txt   ${allRemoteUrls.length} image URL(s) (re-download on your machine if any were blocked)`);
  console.log('\nNext steps:');
  console.log('  1) Open a vision-capable AI and ATTACH every image in photos/.');
  console.log('  2) Paste the contents of SKILL.md.');
  console.log('  3) Paste INPUT.md, fill the « … » blanks, and send.');
  if (!details) console.log('\n(Heads-up: no Google data — INPUT.md has mostly blanks to fill.)');
}

main().catch((e) => { console.error(`Fatal: ${e.message}`); process.exit(1); });
