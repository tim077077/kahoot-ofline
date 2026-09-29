import { createFalClient } from "@fal-ai/client";
import { FAL_MODEL } from "./config";

export class GenerationError extends Error {}

// Returns the URL of the generated image. Without FAL_KEY in development it
// echoes the first input back (as a data URL) so the whole flow can be tested
// for free.
export async function generateImage(images: Blob[], prompt: string): Promise<{ url: string; mock: boolean }> {
  const key = process.env.FAL_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new GenerationError("FAL_KEY is not set");
    const first = images[0];
    const bytes = Buffer.from(await first.arrayBuffer()).toString("base64");
    return { url: `data:${first.type || "image/jpeg"};base64,${bytes}`, mock: true };
  }

  const fal = createFalClient({ credentials: key });
  const imageUrls = await Promise.all(images.map((img) => fal.storage.upload(img)));
  const result = await fal.subscribe(FAL_MODEL, {
    input: {
      prompt,
      image_urls: imageUrls,
      num_images: 1,
      output_format: "jpeg",
      aspect_ratio: "4:5",
    },
  });

  const data = result.data as { images?: { url: string }[] };
  const url = data.images?.[0]?.url;
  if (!url) throw new GenerationError("The model returned no image");
  return { url, mock: false };
}

// Only fal's CDN (or our own dev data URLs) is ever fetched server-side.
export function isAllowedImageUrl(raw: string): boolean {
  if (raw.startsWith("data:image/")) return process.env.NODE_ENV !== "production";
  try {
    const url = new URL(raw);
    const host = url.hostname;
    return url.protocol === "https:" && (host === "fal.media" || host.endsWith(".fal.media") || host.endsWith(".fal.ai"));
  } catch {
    return false;
  }
}

export async function fetchImageBytes(raw: string): Promise<Buffer> {
  if (!isAllowedImageUrl(raw)) throw new GenerationError("Refusing to fetch image from this host");
  const res = await fetch(raw, { cache: "no-store" });
  if (!res.ok) throw new GenerationError(`Image fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
