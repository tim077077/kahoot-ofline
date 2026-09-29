import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { CLAUDE_MODEL } from "./config";
import type { Template } from "./templates";

export const SlideshowSchema = z.object({
  slides: z.array(z.string()),
  caption: z.string(),
  hashtags: z.array(z.string()),
});

export type Slideshow = z.infer<typeof SlideshowSchema>;

export type WriteRequest = {
  template: Template;
  topic: string;
  promote?: string;
  slideCount: number;
};

export class WriterError extends Error {
  constructor(
    message: string,
    readonly code: "refused" | "failed",
  ) {
    super(message);
  }
}

const SYSTEM = `You write TikTok photo-carousel slideshows that people stop scrolling for.

Rules for every slideshow:
- Slide 1 is the hook. It must make someone stop scrolling in under two seconds.
- Every slide is short enough to read in about two seconds: usually under 15 words.
- Write like a real person posting, not a brand. No corporate words, no "unlock", "elevate", "game-changer".
- Specific beats generic: concrete numbers, names and details.
- Never invent facts about real people, companies or products. When a product to feature is given, describe only what the user told you about it.
- The caption is one or two lines that add context or a question, and hashtags are 3-5 relevant ones without the # sign.`;

function userPrompt({ template, topic, promote, slideCount }: WriteRequest) {
  const lines = [
    `Format: ${template.name}`,
    `How this format works: ${template.structure}`,
    `Topic: ${topic}`,
    `Number of slides: exactly ${slideCount}`,
    `Example of this format on another topic (match the style, not the content):`,
    ...template.example.slides.map((s, i) => `${i + 1}. ${s}`),
  ];
  if (promote) {
    lines.push(
      `Product to feature naturally (only use these facts about it): ${promote}`,
      "Feature it once, in a way that fits the format, and never as the hook.",
    );
  }
  return lines.join("\n");
}

// Without an API key in development, return the template's own example so the
// editor can be tested for free.
function mockSlideshow({ template, slideCount }: WriteRequest): Slideshow {
  const slides = template.example.slides.slice(0, slideCount);
  return {
    slides,
    caption: "Demo mode: set ANTHROPIC_API_KEY to write about your own topic.",
    hashtags: ["demo", "slideshow"],
  };
}

let client: Anthropic | null = null;

export async function writeSlideshow(req: WriteRequest): Promise<{ slideshow: Slideshow; mock: boolean }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    if (process.env.NODE_ENV === "production") throw new WriterError("ANTHROPIC_API_KEY is not set", "failed");
    return { slideshow: mockSlideshow(req), mock: true };
  }

  client ??= new Anthropic();
  const response = await client.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // If a safety classifier declines, retry on Anthropic's recommended fallback.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // Short creative copy doesn't need deep reasoning.
    output_config: { effort: "low", format: betaZodOutputFormat(SlideshowSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt(req) }],
  });

  if (response.stop_reason === "refusal") throw new WriterError("The model declined this topic", "refused");
  const parsed = response.parsed_output;
  if (!parsed || parsed.slides.length === 0) throw new WriterError("No slideshow in the response", "failed");

  return {
    slideshow: {
      slides: parsed.slides.slice(0, req.slideCount).map((s) => s.trim()),
      caption: parsed.caption.trim(),
      hashtags: parsed.hashtags.map((h) => h.replace(/^#/, "").trim()).filter(Boolean).slice(0, 5),
    },
    mock: false,
  };
}
