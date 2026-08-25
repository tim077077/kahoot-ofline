const $ = (s) => document.querySelector(s);
const KEY_FIELDS = { k_openai: "openai", k_firecrawl: "firecrawl", k_apify: "apify", k_model: "model", k_google: "google" };
const STORE = "cadru-scanner-keys";

// ---- keys (localStorage, browser-only) --------------------------------------
function loadKeys() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || "{}"); } catch {}
  for (const id in KEY_FIELDS) if (saved[KEY_FIELDS[id]] != null) $("#" + id).value = saved[KEY_FIELDS[id]];
}
function saveKeys() {
  const out = {};
  for (const id in KEY_FIELDS) out[KEY_FIELDS[id]] = $("#" + id).value.trim();
  try { localStorage.setItem(STORE, JSON.stringify(out)); } catch {}
}
function keys() {
  return {
    openaiKey: $("#k_openai").value.trim(),
    firecrawlKey: $("#k_firecrawl").value.trim(),
    apifyToken: $("#k_apify").value.trim() || undefined,
    model: $("#k_model").value.trim() || undefined,
    googleKey: $("#k_google").value.trim() || undefined,
  };
}

// ---- init -------------------------------------------------------------------
async function init() {
  loadKeys();
  for (const id in KEY_FIELDS) $("#" + id).addEventListener("change", saveKeys);

  const cfg = await fetch("/api/config").then((r) => r.json());
  const county = $("#county");
  county.innerHTML = cfg.counties.map((c) => `<option>${c}</option>`).join("");
  const savedCounty = localStorage.getItem("cadru-county");
  if (savedCounty && cfg.counties.includes(savedCounty)) county.value = savedCounty;
  county.addEventListener("change", () => localStorage.setItem("cadru-county", county.value));

  $("#types").innerHTML = cfg.tourismTypes
    .map((t) => `<label><input type="checkbox" value="${t.key}" checked> ${t.label}</label>`).join("");
  if (!$("#k_model").value) $("#k_model").value = cfg.defaultModel || "gpt-4o";

  $("#scanBtn").addEventListener("click", scan);
  $("#genAll").addEventListener("click", generateAll);
}

function status(msg, isErr = false, spin = false) {
  const el = $("#status");
  el.hidden = false;
  el.className = "status" + (isErr ? " err" : "");
  el.innerHTML = (spin ? '<span class="spinner"></span>' : "") + msg;
}

// ---- STEP 1 + 2: scan -------------------------------------------------------
let PLACES = [];
async function scan() {
  const county = $("#county").value;
  const types = [...document.querySelectorAll("#types input:checked")].map((i) => i.value);
  const provider = $("#provider").value;
  const maxPlaces = Number($("#maxPlaces").value) || 60;
  const k = keys();
  if (provider === "places" && !k.googleKey) return status("Sursa Google Places are nevoie de o cheie Google.", true);
  if (provider === "apify" && !k.apifyToken) return status("Sursa Apify are nevoie de token-ul Apify (panoul de chei).", true);

  $("#scanBtn").disabled = true;
  $("#resultsWrap").hidden = true;
  status(`Scanez ${county}...` + (provider === "apify" ? " (Apify poate dura 1-3 minute)" : ""), false, true);
  try {
    const r = await fetch("/api/scan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ county, types, provider, maxPlaces, googleKey: k.googleKey, apifyToken: k.apifyToken }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "scan failed");
    PLACES = data.places;
    renderTable(data);
    status(`Gata. ${data.total} cazări, ${data.candidates} fără site real.` + (data.capped ? " (Google Places limitează la 60; folosește OSM pentru tot județul.)" : ""));
  } catch (e) {
    status(e.message, true);
  } finally {
    $("#scanBtn").disabled = false;
  }
}

function badge(s) {
  const map = { "fără site": "b-nosite", "doar social": "b-social", "doar OTA": "b-ota", "site real": "b-real" };
  return `<span class="badge ${map[s] || "b-real"}">${s}</span>`;
}

function renderTable(data) {
  $("#resultsWrap").hidden = false;
  $("#summary").textContent = `${data.total} cazări · ${data.candidates} candidați (fără site real)`;
  $("#rows").innerHTML = data.places.map((p, i) => `
    <tr data-i="${i}" class="${p.candidate ? "cand" : ""}">
      <td class="name">${esc(p.name)}</td>
      <td>${esc(p.type || "")}</td>
      <td>${esc(p.town || "")}</td>
      <td class="phone">${esc(p.phone || "")}</td>
      <td>${badge(p.status)}</td>
      <td class="demo-cell">${p.candidate ? `<button class="btn gen" data-i="${i}">Generează</button>` : "<span class='muted'>are site</span>"}</td>
    </tr>`).join("");
  document.querySelectorAll(".gen").forEach((b) => b.addEventListener("click", () => generateOne(Number(b.dataset.i))));
}

// ---- STEP 3 + 4: generate ---------------------------------------------------
async function generateOne(i) {
  const place = PLACES[i];
  const k = keys();
  const hasPhotos = place.images && place.images.length;
  if (!k.openaiKey) return status("Adaugă cheia OpenAI (pentru generare) în panoul de chei.", true);
  if (!k.firecrawlKey && !hasPhotos) return status("Adaugă cheia Firecrawl (poze), sau folosește sursa Apify care aduce pozele.", true);

  const cell = document.querySelector(`tr[data-i="${i}"] .demo-cell`);
  cell.innerHTML = `<span class="spinner"></span>caut poze + generez...`;
  try {
    const r = await fetch("/api/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place, openaiKey: k.openaiKey, firecrawlKey: k.firecrawlKey, model: k.model }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "generation failed");
    cell.innerHTML = `<a href="${data.demoUrl}" target="_blank" rel="noopener">Deschide demo ↗</a>
      <span class="rowmsg">${data.photoCount} poze · ${esc(data.model)}${data.imageNote ? " · " + esc(data.imageNote) : ""}</span>`;
  } catch (e) {
    cell.innerHTML = `<button class="btn gen" data-i="${i}">Reîncearcă</button><span class="rowmsg">${esc(e.message)}</span>`;
    cell.querySelector(".gen").addEventListener("click", () => generateOne(i));
  }
}

async function generateAll() {
  const candidates = PLACES.map((p, i) => (p.candidate ? i : -1)).filter((i) => i >= 0);
  const anyNeedsFirecrawl = candidates.some((i) => !(PLACES[i].images && PLACES[i].images.length));
  if (!keys().openaiKey) return status("Adaugă cheia OpenAI întâi.", true);
  if (anyNeedsFirecrawl && !keys().firecrawlKey) return status("Unii candidați nu au poze din enumerare; adaugă cheia Firecrawl sau folosește sursa Apify.", true);
  $("#genAll").disabled = true;
  for (let n = 0; n < candidates.length; n++) {
    status(`Generez ${n + 1}/${candidates.length}...`, false, true);
    await generateOne(candidates[n]); // sequential, to stay polite to the APIs and control cost
  }
  status(`Gata. Am încercat ${candidates.length} candidați.`);
  $("#genAll").disabled = false;
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

init();
