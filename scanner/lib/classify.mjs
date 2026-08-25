// STEP 2 - decide whether a place has a REAL website.
// Facebook / Instagram / linktr.ee / Google auto-sites all count as "no real site"
// and therefore as a prospect.

import { hostOf } from "./util.mjs";

const SOCIAL_HOSTS = [
  "facebook.com", "m.facebook.com", "fb.com", "fb.me",
  "instagram.com", "instagr.am",
  "linktr.ee", "linktree.com", "linkin.bio", "taplink.cc",
  "business.site", "google.com", "goo.gl", "maps.app.goo.gl", // Google auto-pages
  "wa.me", "api.whatsapp.com",
  "tiktok.com", "booking.com", "travelminit.ro", "airbnb.com", // OTA-only = no own site
];

export function classify(place) {
  const website = (place.website || "").trim();
  const host = hostOf(website);
  const hasFacebook = !!place.facebook || host.includes("facebook") || host.includes("instagram");

  let status, candidate;
  if (!website) {
    status = hasFacebook ? "doar social" : "fără site";
    candidate = true;
  } else if (SOCIAL_HOSTS.some((h) => host === h || host.endsWith("." + h) || host.includes(h.split(".")[0]))) {
    status = host.includes("booking") || host.includes("travelminit") || host.includes("airbnb")
      ? "doar OTA" : "doar social";
    candidate = true;
  } else {
    status = "site real";
    candidate = false;
  }
  return { ...place, status, candidate };
}

export function classifyAll(places) {
  const rows = places.map(classify);
  // Best prospects first: no site, then social-only, then OTA-only, then the rest.
  const rank = { "fără site": 0, "doar social": 1, "doar OTA": 2, "site real": 3 };
  rows.sort((a, b) => (rank[a.status] - rank[b.status]) || (b.reviews || 0) - (a.reviews || 0));
  return rows;
}
