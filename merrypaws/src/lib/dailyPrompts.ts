// Today's prompt for the photo of the day. A different small idea every day
// keeps the habit fresh (and a little unpredictable) without asking much.
// The prompts themselves live in each language's catalog (daily.prompts);
// every catalog has the same number, so a day gets the same prompt in all of them.

export const PROMPT_COUNT = 40;

export function promptIndex(day: string) {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % PROMPT_COUNT;
}
