// Single place for the name, model and limits.
export const BRAND = "SlideDrop";

export const LIMITS = {
  // AI calls (copying a format or writing slides) per IP per day, and in
  // total per day. Generous by default because this runs as your own tool;
  // lower them before putting it on the internet.
  freePerIpPerDay: Number(process.env.AI_PER_IP_PER_DAY ?? 100),
  freeGlobalPerDay: Number(process.env.AI_GLOBAL_DAILY_CAP ?? 300),
  maxSlides: 10,
  maxTopicChars: 200,
};

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

// Used instead of Claude when only GEMINI_API_KEY is set (README → Use a Google key).
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
