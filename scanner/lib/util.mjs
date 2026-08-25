// Small shared helpers. No dependencies.

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function slugify(str = "") {
  return String(str)
    .normalize("NFD").replace(/\p{Diacritic}/gu, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "loc";
}

export function hostOf(url = "") {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return ""; }
}

// fetch with retries + exponential backoff. Returns the Response (caller reads it).
export async function fetchRetry(url, opts = {}, { retries = 3, backoff = 800, timeout = 60000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(t);
      // Retry only on transient server / rate-limit statuses.
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) { await sleep(backoff * 2 ** attempt); continue; }
      }
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
      if (attempt < retries) { await sleep(backoff * 2 ** attempt); continue; }
    }
  }
  throw lastErr || new Error("fetch failed");
}

export async function fetchJson(url, opts, retryCfg) {
  const res = await fetchRetry(url, opts, retryCfg);
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const msg = typeof body === "object" && body ? (body.error?.message || body.message || JSON.stringify(body)) : String(body).slice(0, 300);
    const err = new Error(`HTTP ${res.status}: ${msg}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}
