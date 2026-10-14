// Prompt lab: run your test photos through every era and look at the results
// side by side before shipping a prompt or model change.
//
//   1. Put ~20 real pet photos in prompt-lab/photos/ (different breeds and
//      colours, some in bad light, a few with odd markings). Optionally put one
//      photo of a person in prompt-lab/owner.jpg to test "Add me too".
//      No photos yet? `npm run lab -- --sample` downloads 20 random dogs from
//      dog.ceo to start with. Real photos from friends are the better test.
//   2. GEMINI_API_KEY=... npm run lab -- --yes            (all eras, main model)
//      GEMINI_API_KEY=... npm run lab -- --yes --model gemini-3.1-flash-image
//      GEMINI_API_KEY=... npm run lab -- --yes --styles royal-court,film-noir
//   3. Open prompt-lab/out/index.html. Each row is one pet: the original, then
//      every era. Ask one question per cell: "is that the same animal?"
//
// It costs money (the script prints an estimate and needs --yes).

import { GoogleGenAI } from "@google/genai";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPortraitPrompt, STYLES } from "../src/lib/styles";

const ROOT = path.join(process.cwd(), "prompt-lab");
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const model = flag("model") ?? process.env.GEMINI_IMAGE_MODEL ?? "gemini-nano-banana-2.1";
const styles = flag("styles") ? STYLES.filter((s) => flag("styles")!.split(",").includes(s.id)) : STYLES;
// Nano Banana 2.1 at 1K: $0.0336 per image plus about $0.003 of input.
const pricePerImage = Number(flag("price") ?? 0.037);

// 20 random dogs from the free dog.ceo API, so the lab can run on day one.
async function downloadSamples() {
  const dir = path.join(ROOT, "photos");
  await mkdir(dir, { recursive: true });
  const res = await fetch("https://dog.ceo/api/breeds/image/random/20");
  const { message } = (await res.json()) as { message: string[] };
  let n = 0;
  for (const url of message) {
    const img = await fetch(url);
    if (!img.ok) continue;
    await writeFile(path.join(dir, `sample-${String(++n).padStart(2, "0")}.jpg`), Buffer.from(await img.arrayBuffer()));
  }
  console.log(`Saved ${n} sample dogs to prompt-lab/photos/.`);
}

async function main() {
  if (args.includes("--sample")) return downloadSamples();
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("Set GEMINI_API_KEY first (https://aistudio.google.com/apikey).");
  const photos = (await readdir(path.join(ROOT, "photos"))).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  if (photos.length === 0) throw new Error("Put some pet photos in prompt-lab/photos/ first.");
  const ownerPath = path.join(ROOT, "owner.jpg");
  const withOwner = existsSync(ownerPath);

  // Every pet in every era, plus the first three pets with the owner.
  const jobs = photos.flatMap((photo, i) =>
    styles.flatMap((style) => [
      { photo, style, owner: false },
      ...(withOwner && i < 3 ? [{ photo, style, owner: true }] : []),
    ]),
  );
  const estimate = (jobs.length * pricePerImage).toFixed(2);
  console.log(`${jobs.length} images with ${model}, about $${estimate}.`);
  if (!args.includes("--yes")) {
    console.log("Add --yes to run it.");
    return;
  }

  const ai = new GoogleGenAI({ apiKey: key });
  const load = async (file: string) => {
    const bytes = await readFile(file);
    const mimeType = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return { inlineData: { mimeType, data: bytes.toString("base64") } };
  };
  const pets = new Map<string, Awaited<ReturnType<typeof load>>>();
  for (const photo of photos) pets.set(photo, await load(path.join(ROOT, "photos", photo)));
  const ownerPart = withOwner ? await load(ownerPath) : null;

  const outDir = path.join(ROOT, "out");
  await mkdir(outDir, { recursive: true });
  const results = new Map<string, string>();

  // Three at a time: fast enough, and gentle on rate limits.
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      const name = `${path.parse(job.photo).name}__${job.style.id}${job.owner ? "__owner" : ""}.jpg`;
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [pets.get(job.photo)!, ...(job.owner ? [ownerPart!] : []), { text: buildPortraitPrompt(job.style, job.owner) }],
            },
          ],
          config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:5", imageSize: "1K" } },
        });
        const image = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
        if (!image?.data) throw new Error(`no image returned (${res.candidates?.[0]?.finishReason ?? "empty"})`);
        await writeFile(path.join(outDir, name), Buffer.from(image.data, "base64"));
        results.set(name, name);
        console.log("ok  ", name);
      } catch (err) {
        results.set(name, `error: ${err instanceof Error ? err.message : String(err)}`);
        console.log("fail", name, err instanceof Error ? err.message : err);
      }
    }
  }
  await Promise.all([worker(), worker(), worker()]);

  const cell = (name: string) => {
    const value = results.get(name);
    if (!value) return "<td></td>";
    return value.startsWith("error")
      ? `<td class="err">${value.replace(/</g, "&lt;")}</td>`
      : `<td><img src="${value}" loading="lazy"></td>`;
  };
  const header = styles.map((s) => `<th>${s.title}</th>`).join("");
  const rows = photos
    .flatMap((photo, i) => {
      const base = path.parse(photo).name;
      const row = (owner: boolean) =>
        `<tr><td><img src="../photos/${photo}"><br>${base}${owner ? " + owner" : ""}</td>${styles
          .map((s) => cell(`${base}__${s.id}${owner ? "__owner" : ""}.jpg`))
          .join("")}</tr>`;
      return [row(false), ...(withOwner && i < 3 ? [row(true)] : [])];
    })
    .join("\n");
  await writeFile(
    path.join(outDir, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Prompt lab</title>
<style>body{font:14px system-ui;margin:16px;background:#f5eee3}table{border-collapse:collapse}td,th{padding:4px;vertical-align:top;text-align:center}img{width:180px;display:block}.err{color:#7a0f1b;width:180px}</style>
<h1>Prompt lab: ${model}</h1><p>${new Date().toISOString()}. Ask of every cell: is that the same animal?</p>
<table><tr><th>Original</th>${header}</tr>${rows}</table>`,
  );
  console.log(`Open ${path.join(outDir, "index.html")}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
