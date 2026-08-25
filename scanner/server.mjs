// Cadru Scanner - local server.
// Binds to 127.0.0.1 only. API keys arrive in request bodies from the browser and
// are used per-request; they are never logged or written to disk.

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COUNTIES, TOURISM_TYPES } from "./lib/counties.mjs";
import { enumerate } from "./lib/enumerate.mjs";
import { classifyAll } from "./lib/classify.mjs";
import { extractImages } from "./lib/images.mjs";
import { generateSite } from "./lib/generate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const HOST = process.env.HOST || "127.0.0.1";

const app = express();
app.use(express.json({ limit: "1mb" }));
// Request log WITHOUT bodies, so pasted keys never hit the console.
app.use((req, _res, next) => { console.log(`${new Date().toISOString()}  ${req.method} ${req.path}`); next(); });

app.use(express.static(path.join(__dirname, "public")));
app.use("/demos", express.static(path.join(__dirname, "output")));

app.get("/api/config", (_req, res) => {
  res.json({ counties: COUNTIES, tourismTypes: TOURISM_TYPES, defaultModel: process.env.OPENAI_MODEL || "gpt-4o" });
});

// STEP 1 + 2: enumerate a county and classify website status.
app.post("/api/scan", async (req, res) => {
  const { county, types = [], provider = "osm", googleKey } = req.body || {};
  try {
    const raw = await enumerate({ provider, county, types, googleKey });
    const rows = classifyAll(raw);
    res.json({
      county,
      provider,
      total: rows.length,
      candidates: rows.filter((r) => r.candidate).length,
      capped: !!raw._capped,
      places: rows,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// STEP 3 + 4: extract images for one place and generate its demo site.
app.post("/api/generate", async (req, res) => {
  const { place, firecrawlKey, openaiKey, model } = req.body || {};
  if (!place || !place.name) return res.status(400).json({ error: "place is required" });
  try {
    const imgs = await extractImages(place, { firecrawlKey });
    const result = await generateSite(
      { place, images: imgs.images, screenshot: imgs.screenshot, source: imgs.source },
      { openaiKey, model },
    );
    res.json({ ...result, imageNote: imgs.note, foundImages: imgs.images.length, hasScreenshot: !!imgs.screenshot });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`\n  Cadru Scanner running at  http://${HOST}:${PORT}\n`);
});
