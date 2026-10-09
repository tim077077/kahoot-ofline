/*
 * VintedBot TikTok Poster — page↔background bridge (runs in the ISOLATED world,
 * so it can use chrome.runtime). The MAIN-world injector posts an "upload"
 * message with the image bytes; we relay it to the background worker (which can
 * reach the CDN without CORS/CSP) and post the result back to the page.
 */
window.addEventListener("message", (ev) => {
  if (ev.source !== window) return;
  const d = ev.data;
  if (!d || d.__vbtt !== "upload") return;
  try {
    chrome.runtime.sendMessage(
      { type: "vbUpload", url: d.url, crc: d.crc, storageU: d.storageU, b64: d.b64 },
      (resp) => {
        const json = (resp && resp.json) || (resp && resp.error ? { message: "bg error: " + resp.error } : {});
        window.postMessage({ __vbtt: "uploadResult", id: d.id, json, status: resp && resp.status, text: resp && resp.text, sentBytes: resp && resp.sentBytes, respHeaders: resp && resp.respHeaders }, "*");
      }
    );
  } catch (e) {
    window.postMessage({ __vbtt: "uploadResult", id: d.id, json: { message: "bridge error: " + (e && e.message) } }, "*");
  }
});

// SlideDrop queue calls: relay to the background worker (see sdApi in bg.js).
window.addEventListener("message", (ev) => {
  if (ev.source !== window) return;
  const d = ev.data;
  if (!d || d.__sd !== "api") return;
  try {
    chrome.runtime.sendMessage(
      { type: "sdApi", base: d.base, method: d.method, path: d.path, body: d.body, binary: d.binary },
      (resp) => window.postMessage({ __sd: "apiResult", id: d.id, resp: resp || { error: "no response" } }, "*")
    );
  } catch (e) {
    window.postMessage({ __sd: "apiResult", id: d.id, resp: { error: "bridge error: " + (e && e.message) } }, "*");
  }
});
