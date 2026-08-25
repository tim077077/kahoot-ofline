// STEP 3 - find and extract a property's real photos with Firecrawl.
//
// Strategy: a prospect with "no real website" still lives somewhere online (its own
// Facebook page, a Booking/Travelminit listing). We:
//   1. Discover the best page to scrape (Firecrawl /search on "<name> <town>").
//   2. Scrape it (Firecrawl /scrape) asking for html + a full-page screenshot.
//   3. Pull real photo URLs out of the html (Booking's cf.bstatic.com etc.), and
//      keep the screenshot as a fallback so the generator can still SEE the place
//      even when a CDN blocks the individual images.
//
// Firecrawl refuses to scrape facebook.com directly, so for FB-only places we lean
// on the Booking/Travelminit listing that /search usually turns up.

import { fetchJson, hostOf } from "./util.mjs";

const FC_BASE = process.env.FIRECRAWL_BASE || "https://api.firecrawl.dev/v1";

const PHOTO_HOSTS = ["cf.bstatic.com", "bstatic.com", "travelminit", "imgix", "cloudinary", "cdn", "static", "photos", "images"];
const LISTING_HOSTS = ["booking.com", "travelminit.ro", "hotel", "tripadvisor", "cazare"];

export async function extractImages(place, { firecrawlKey } = {}) {
  if (!firecrawlKey) throw new Error("Firecrawl API key is required to extract images.");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${firecrawlKey}` };

  // 1. Pick the URL to scrape.
  let target = place.website && !hostOf(place.website).includes("facebook") ? place.website : "";
  let discovered = [];
  if (!target) {
    try {
      const q = `${place.name} ${place.town || place.county} cazare booking`;
      const search = await fetchJson(`${FC_BASE}/search`, {
        method: "POST", headers, body: JSON.stringify({ query: q, limit: 6 }),
      }, { retries: 2 });
      discovered = (search.data || search.results || []).map((r) => r.url).filter(Boolean);
      target = discovered.find((u) => LISTING_HOSTS.some((h) => hostOf(u).includes(h)))
            || discovered.find((u) => !hostOf(u).includes("facebook"))
            || "";
    } catch (e) { /* search may be unavailable on some plans; fall through */ }
  }
  if (!target && place.facebook) target = place.facebook; // last resort (may be refused)
  if (!target) return { images: [], screenshot: null, source: null, note: "No scrapeable page found for this place." };

  // 2. Scrape it.
  let data;
  try {
    const scrape = await fetchJson(`${FC_BASE}/scrape`, {
      method: "POST", headers,
      body: JSON.stringify({
        url: target,
        formats: ["html", "screenshot"],
        onlyMainContent: false,
        waitFor: 2500,
      }),
    }, { retries: 2, timeout: 90000 });
    data = scrape.data || scrape;
  } catch (e) {
    return { images: [], screenshot: null, source: target, note: `Scrape failed: ${e.message}` };
  }

  // 3. Pull image URLs out of the returned HTML.
  const html = data.html || "";
  const found = new Set();
  const re = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) && found.size < 40) {
    let u = m[1];
    if (u.startsWith("//")) u = "https:" + u;
    if (!/^https?:\/\//.test(u)) continue;
    if (/\.svg($|\?)|sprite|logo|icon|avatar|placeholder|1x1|blank|pixel/i.test(u)) continue;
    found.add(u);
  }
  // Prefer real photo CDNs; keep the biggest-looking ones first.
  const images = [...found]
    .sort((a, b) => score(b) - score(a))
    .slice(0, 12);

  const screenshot = data.screenshot || data.screenshotUrl || (data.metadata && data.metadata.screenshot) || null;
  return { images, screenshot, source: target, note: images.length ? null : "No inline photos found; using screenshot." };
}

function score(u) {
  const host = hostOf(u);
  let s = 0;
  if (PHOTO_HOSTS.some((h) => host.includes(h) || u.includes(h))) s += 5;
  if (/\/(max|large|1024|1280|1600|full|xl)/i.test(u)) s += 3;
  if (/\.jpe?g($|\?)/i.test(u)) s += 1;
  return s;
}
