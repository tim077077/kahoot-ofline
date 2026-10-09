import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { FinishReason, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { BASE_REQUEST, ClaudeError, getClaude } from "./claude";
import { CLAUDE_MODEL, GEMINI_MODEL } from "./config";

// One way to ask the AI for a structured answer, whichever provider is set up:
// - ANTHROPIC_API_KEY → Claude (the default when both keys are set)
// - GEMINI_API_KEY (or GOOGLE_API_KEY) → Gemini
// - AI_PROVIDER=claude|gemini picks one when both are set.
// No key: the callers return demo output locally.

export type AiProvider = "claude" | "gemini";
export type AiPart = { type: "text"; text: string } | { type: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

const geminiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

export function aiProvider(): AiProvider | null {
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGemini = Boolean(geminiKey());
  const wanted = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (wanted === "gemini" && hasGemini) return "gemini";
  if (wanted === "claude" && hasClaude) return "claude";
  if (hasClaude) return "claude";
  if (hasGemini) return "gemini";
  return null;
}

export const hasAiKey = () => aiProvider() !== null;

export function aiModel(provider = aiProvider()) {
  return provider === "gemini" ? GEMINI_MODEL : CLAUDE_MODEL;
}

// Locally a missing key means demo output; deployed, it's an error.
export function assertDemoAllowed() {
  if (process.env.VERCEL) throw new ClaudeError("No AI key is set (ANTHROPIC_API_KEY or GEMINI_API_KEY)", "failed");
}

let gemini: GoogleGenAI | null = null;
export function getGemini() {
  gemini ??= new GoogleGenAI({ apiKey: geminiKey(), httpOptions: { timeout: 180_000 } });
  return gemini;
}

type Request<S extends z.ZodType> = {
  system: string;
  content: AiPart[];
  schema: S;
  effort: "low" | "medium" | "high";
  // Claude only: adaptive thinking, and streaming for long requests.
  thinking?: boolean;
  stream?: boolean;
  maxTokens?: number;
  // Shown in the refusal error, e.g. "these screenshots".
  what: string;
};

export async function structured<S extends z.ZodType>(req: Request<S>): Promise<z.infer<S>> {
  return aiProvider() === "gemini" ? askGemini(req) : askClaude(req);
}

async function askClaude<S extends z.ZodType>(req: Request<S>): Promise<z.infer<S>> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = req.content.map((p) =>
    p.type === "text" ? { type: "text", text: p.text } : { type: "image", source: { type: "base64", media_type: p.mediaType, data: p.data } },
  );
  const params = {
    ...BASE_REQUEST,
    ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
    ...(req.thinking ? { thinking: { type: "adaptive" as const } } : {}),
    output_config: { effort: req.effort, format: betaZodOutputFormat(req.schema) },
    system: req.system,
    messages: [{ role: "user" as const, content }],
  };
  const response = req.stream ? await getClaude().beta.messages.stream(params).finalMessage() : await getClaude().beta.messages.parse(params);
  if (response.stop_reason === "refusal") throw new ClaudeError(`The model declined ${req.what}`, "refused");
  if (!response.parsed_output) throw new ClaudeError("No answer in the response", "failed");
  return response.parsed_output as z.infer<S>;
}

// Gemini's structured output takes a JSON Schema; the answer is checked
// against the same zod schema Claude uses, so the rest of the app can't tell
// the difference.
export function geminiSchema(schema: z.ZodType) {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

const BLOCKED = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
  FinishReason.RECITATION,
  FinishReason.IMAGE_SAFETY,
]);

async function askGemini<S extends z.ZodType>(req: Request<S>): Promise<z.infer<S>> {
  const response = await getGemini().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: req.content.map((p) => (p.type === "text" ? { text: p.text } : { inlineData: { mimeType: p.mediaType, data: p.data } })),
      },
    ],
    config: {
      systemInstruction: req.system,
      responseMimeType: "application/json",
      responseJsonSchema: geminiSchema(req.schema),
      maxOutputTokens: req.maxTokens ?? BASE_REQUEST.max_tokens,
    },
  });
  const finish = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || (finish && BLOCKED.has(finish))) {
    throw new ClaudeError(`The model declined ${req.what}`, "refused");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(response.text ?? "");
  } catch {
    throw new ClaudeError(`No answer in the response (${finish ?? "empty"})`, "failed");
  }
  const parsed = req.schema.safeParse(raw);
  if (!parsed.success) throw new ClaudeError("Gemini's answer didn't match the expected shape", "failed");
  return parsed.data as z.infer<S>;
}
