import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL } from "./config";

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly code: "refused" | "failed",
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;

export function hasClaudeKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getClaude() {
  client ??= new Anthropic();
  return client;
}

// Shared request settings: if a safety classifier declines, the API retries
// on Anthropic's recommended fallback model.
export const BASE_REQUEST = {
  model: CLAUDE_MODEL,
  max_tokens: 16000,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default" as const,
};
