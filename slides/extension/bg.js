/*
 * SlideDrop Poster (was VintedBot TikTok Poster) — background service worker.
 * Uploads the image bytes to TikTok's CDN. Extension background fetches with
 * host_permissions are NOT subject to the page's CSP or to CORS, which is what
 * blocks a direct in-page upload. bridge.js relays the bytes here.
 *
 * The CDN rejects the upload with an empty 204 unless the request carries
 * Origin/Referer of www.tiktok.com — and a background fetch omits Origin (JS
 * cannot set it). So we stamp them on with a declarativeNetRequest rule.
 */
const DNR_RULE = {
  id: 1,
  priority: 1,
  action: {
    type: "modifyHeaders",
    requestHeaders: [
      { header: "origin", operation: "set", value: "https://www.tiktok.com" },
      { header: "referer", operation: "set", value: "https://www.tiktok.com/" },
    ],
  },
  condition: {
    urlFilter: "/upload/v1/",
    requestDomains: ["tiktokcdn-eu.com", "tiktokcdn.com", "byteimg.com"],
    resourceTypes: ["xmlhttprequest", "other"],
  },
};
async function ensureRule() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1], addRules: [DNR_RULE] });
  } catch (e) { console.warn("[VBTikTok bg] could not set header rule:", e); }
}
ensureRule();
chrome.runtime.onInstalled.addListener(ensureRule);
chrome.runtime.onStartup.addListener(ensureRule);
// Only TikTok's upload servers. Without this, any script on tiktok.com could
// use the relay to POST to other hosts this extension can reach (localhost).
const UPLOAD_HOSTS = ["tiktokcdn-eu.com", "tiktokcdn.com", "byteimg.com"];
function isUploadUrl(raw) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && u.pathname.startsWith("/upload/v1/") &&
      UPLOAD_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch (_) { return false; }
}

// ---- SlideDrop: the local queue -------------------------------------------
// The panel asks for queued posts and slide images from SlideDrop running on
// this computer, and reports results back. Only these three calls, only to
// localhost, and always with the x-slidedrop header SlideDrop requires.
const SD_ALLOWED = [
  ["GET", /^\/api\/extension\/queue$/],
  ["POST", /^\/api\/extension\/result$/],
  ["GET", /^\/api\/posts\/p_[a-z0-9]+\/slides\/\d+$/],
];
async function sdApi(msg) {
  const base = String(msg.base || "");
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?$/.test(base)) return { error: "SlideDrop address must be http://localhost:<port>" };
  if (!SD_ALLOWED.some(([m, re]) => m === msg.method && re.test(msg.path))) return { error: "not allowed" };
  const r = await fetch(base + msg.path, {
    method: msg.method,
    headers: { "x-slidedrop": "1", ...(msg.body ? { "content-type": "application/json" } : {}) },
    body: msg.body ? JSON.stringify(msg.body) : undefined,
  });
  if (msg.binary) {
    if (!r.ok) return { status: r.status, error: "slide " + r.status };
    const u = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return { status: r.status, b64: btoa(bin), type: r.headers.get("content-type") || "image/jpeg" };
  }
  return { status: r.status, json: await r.json().catch(() => ({})) };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "sdApi") {
    sdApi(msg).then(sendResponse, (e) => sendResponse({ error: "SlideDrop isn't running? " + ((e && e.message) || e) }));
    return true;
  }
  if (!msg || msg.type !== "vbUpload") return;
  if (!isUploadUrl(msg.url)) { sendResponse({ error: "upload url not allowed" }); return; }
  (async () => {
    try {
      await ensureRule(); // make sure the Origin/Referer rule is active before we upload
      const bin = atob(msg.b64);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const r = await fetch(msg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-CRC32": msg.crc,
          "Content-Disposition": 'attachment; filename="undefined"',
          ...(msg.storageU ? { "X-Storage-U": String(msg.storageU) } : {}),
        },
        body: u,
      });
      const text = await r.text().catch(() => "");
      let json = {};
      try { json = JSON.parse(text); } catch (_) {}
      const hdrs = {};
      r.headers.forEach((v, k) => { hdrs[k] = v; });
      sendResponse({ json, status: r.status, text: text.slice(0, 300), sentBytes: u.length, respHeaders: hdrs });
    } catch (e) {
      sendResponse({ error: String((e && e.message) || e) });
    }
  })();
  return true; // async sendResponse
});
