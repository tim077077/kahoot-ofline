// STEP 1 - enumerate every accommodation in a county.
//
// Default provider: OpenStreetMap Overpass API (free, no key). It queries the
// county's administrative boundary directly and returns name, website tag, phone
// and coordinates for every tourism=* accommodation. Completeness depends on OSM,
// so small pensions can be missing - the README explains the paid upgrades
// (Apify / Outscraper / Google Places) that get closer to "all".
//
// Optional provider: Google Places API (New) Text Search. Authoritative, but hard
// -capped at 60 results per query (20/page x 3 pages), so a whole county needs the
// gridded approach for full coverage; here we do a single county-wide text query
// and clearly flag the cap.

import { fetchJson, fetchRetry, hostOf, sleep } from "./util.mjs";

const OVERPASS_URL = process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter";

export async function enumerate({ provider = "osm", county, types = [], googleKey } = {}) {
  if (!county) throw new Error("county is required");
  if (provider === "places") return enumeratePlaces({ county, types, googleKey });
  return enumerateOverpass({ county, types });
}

// ---- OpenStreetMap Overpass -------------------------------------------------
async function enumerateOverpass({ county, types }) {
  const tourism = (types.length ? types : [
    "hotel", "guest_house", "motel", "chalet", "hostel", "apartment", "resort", "camp_site",
  ]).map((t) => t.replace(/[^a-z_]/g, "")).join("|");

  // admin_level=4 is the county (județ) level in Romania.
  const ql = `[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="4"]["name"="${county}"]->.a;
(
  nwr["tourism"~"^(${tourism})$"](area.a);
);
out center tags;`;

  const res = await fetchRetry(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "cadru-scanner/0.1 (studio lead tool)" },
    body: "data=" + encodeURIComponent(ql),
  }, { retries: 2, backoff: 2000, timeout: 200000 });

  const text = await res.text();
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}: ${text.slice(0, 200)}`);
  let json;
  try { json = JSON.parse(text); } catch { throw new Error("Overpass returned non-JSON (often rate limiting). Try again in a minute."); }

  const elements = json.elements || [];
  if (!elements.length) {
    throw new Error(`No area found for "${county}" (or it has no tagged accommodation). Check the county name spelling/diacritics.`);
  }

  const places = [];
  for (const el of elements) {
    const tags = el.tags || {};
    if (!tags.name) continue; // unnamed nodes are useless as leads
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    const website = tags.website || tags["contact:website"] || tags.url || tags["contact:url"] || "";
    const facebook = tags["contact:facebook"] || (hostOf(website).includes("facebook") ? website : "");
    places.push({
      id: `osm-${el.type}-${el.id}`,
      name: tags.name,
      type: tags.tourism || "cazare",
      town: tags["addr:city"] || tags["addr:village"] || tags["addr:town"] || "",
      county,
      address: [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
      phone: tags.phone || tags["contact:phone"] || tags["contact:mobile"] || "",
      email: tags.email || tags["contact:email"] || "",
      website,
      facebook,
      lat, lon,
      mapsUrl: lat && lon ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : "",
      source: "osm",
    });
  }
  return dedupe(places);
}

// ---- Google Places API (New) - optional ------------------------------------
async function enumeratePlaces({ county, types, googleKey }) {
  if (!googleKey) throw new Error("Google Places provider selected but no Google API key was provided.");
  const fieldMask = [
    "places.id", "places.displayName", "places.formattedAddress", "places.websiteUri",
    "places.nationalPhoneNumber", "places.location", "places.rating",
    "places.userRatingCount", "places.types", "nextPageToken",
  ].join(",");

  const out = [];
  let pageToken;
  for (let page = 0; page < 3; page++) { // hard cap: 60 results total
    const body = {
      textQuery: `pensiuni, hoteluri și cabane în județul ${county}, România`,
      languageCode: "ro", regionCode: "RO", pageSize: 20,
      ...(pageToken ? { pageToken } : {}),
    };
    const json = await fetchJson("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": googleKey, "X-Goog-FieldMask": fieldMask },
      body: JSON.stringify(body),
    });
    for (const p of json.places || []) {
      const website = p.websiteUri || "";
      out.push({
        id: `gp-${p.id}`,
        name: p.displayName?.text || "(fără nume)",
        type: (p.types || []).find((t) => /hotel|lodging|guest|motel|resort|hostel/.test(t)) || "cazare",
        town: "", county,
        address: p.formattedAddress || "",
        phone: p.nationalPhoneNumber || "",
        email: "",
        website,
        facebook: hostOf(website).includes("facebook") ? website : "",
        lat: p.location?.latitude, lon: p.location?.longitude,
        rating: p.rating, reviews: p.userRatingCount,
        mapsUrl: p.location ? `https://www.google.com/maps/search/?api=1&query=${p.location.latitude},${p.location.longitude}` : "",
        source: "google-places",
      });
    }
    pageToken = json.nextPageToken;
    if (!pageToken) break;
    await sleep(2500); // next_page_token needs a couple seconds to become valid
  }
  out._capped = out.length >= 60; // signal the 60-result cap to the caller
  return dedupe(out);
}

function dedupe(places) {
  const seen = new Map();
  for (const p of places) {
    const key = `${(p.name || "").toLowerCase().trim()}|${p.town || ""}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()];
}
