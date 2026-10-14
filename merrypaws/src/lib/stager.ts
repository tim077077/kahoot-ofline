import { FinishReason, GoogleGenAI } from "@google/genai";
import { GEMINI_FALLBACK_MODEL, GEMINI_IMAGE_MODEL } from "./config";

export class GenerationError extends Error {}

// The image itself, straight from Google's Gemini API (no middleman). Without
// a key in development it echoes the first input back, so the whole flow can
// be tested for free.
export type Generated = { bytes: Buffer; mimeType: string; mock: boolean; model?: string };

export const geminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

let client: GoogleGenAI | null = null;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: geminiKey(), httpOptions: { timeout: 50_000 } });
  return client;
}

const BLOCKED = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
  FinishReason.IMAGE_SAFETY,
]);

// Tries the main model, then the fallback. A safety refusal isn't retried:
// the fallback would refuse the same photo and cost a second call.
export async function generateImage(images: Blob[], prompt: string): Promise<Generated> {
  if (!geminiKey()) {
    if (process.env.NODE_ENV === "production") throw new GenerationError("GEMINI_API_KEY is not set");
    const first = images[0];
    return { bytes: Buffer.from(await first.arrayBuffer()), mimeType: first.type || "image/jpeg", mock: true };
  }

  const parts = [
    ...(await Promise.all(
      images.map(async (img) => ({
        inlineData: { mimeType: img.type || "image/jpeg", data: Buffer.from(await img.arrayBuffer()).toString("base64") },
      })),
    )),
    { text: prompt },
  ];
  const models = [GEMINI_IMAGE_MODEL, GEMINI_FALLBACK_MODEL].filter((m, idx, all): m is string => Boolean(m) && all.indexOf(m) === idx);

  let lastError: unknown;
  for (const model of models) {
    try {
      const res = await gemini().models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        // 1K is plenty for a phone and a print up to about 4x5 inches, and the
        // cheapest size.
        config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "4:5", imageSize: "1K" } },
      });
      const candidate = res.candidates?.[0];
      if (res.promptFeedback?.blockReason || (candidate?.finishReason && BLOCKED.has(candidate.finishReason))) {
        throw new GenerationError(`refused: ${res.promptFeedback?.blockReason ?? candidate?.finishReason}`);
      }
      const image = candidate?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
      if (!image?.data) throw new GenerationError(`${model} returned no image (${candidate?.finishReason ?? "empty"})`);
      return { bytes: Buffer.from(image.data, "base64"), mimeType: image.mimeType || "image/png", mock: false, model };
    } catch (err) {
      lastError = err;
      console.error(JSON.stringify({ event: "model_failed", model, reason: err instanceof Error ? err.message : String(err) }));
      if (err instanceof GenerationError && err.message.startsWith("refused")) break;
    }
  }
  throw lastError instanceof Error ? lastError : new GenerationError("Every model failed");
}
