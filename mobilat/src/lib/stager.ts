import { createFalClient } from "@fal-ai/client";
import { FAL_MODEL } from "./config";

export class StagingError extends Error {}

// Returns the URL of the generated image. Without FAL_KEY in development it
// echoes the input back so the whole flow can be tested for free.
export async function stageImage(image: Blob, prompt: string): Promise<{ url: string; mock: boolean }> {
  const key = process.env.FAL_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new StagingError("FAL_KEY is not set");
    const bytes = Buffer.from(await image.arrayBuffer()).toString("base64");
    return { url: `data:${image.type || "image/jpeg"};base64,${bytes}`, mock: true };
  }

  const fal = createFalClient({ credentials: key });
  const uploadedUrl = await fal.storage.upload(image);
  const result = await fal.subscribe(FAL_MODEL, {
    input: {
      prompt,
      image_urls: [uploadedUrl],
      num_images: 1,
      output_format: "jpeg",
    },
  });

  const data = result.data as { images?: { url: string }[] };
  const url = data.images?.[0]?.url;
  if (!url) throw new StagingError("The model returned no image");
  return { url, mock: false };
}
