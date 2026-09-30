// What they were up to: the highlights of the album. Each photo can carry a
// few of these, or a custom one the owner types.

export type Activity = { id: string; label: string; caption: string };

export const ACTIVITIES: Activity[] = [
  { id: "walks", label: "Walks", caption: "Out and about" },
  { id: "naps", label: "Naps", caption: "Sweet dreams" },
  { id: "play", label: "Playtime", caption: "Zoomies and toys" },
  { id: "adventures", label: "Adventures", caption: "Somewhere new" },
  { id: "beach", label: "Beach days", caption: "Sand in the paws" },
  { id: "snow", label: "Snow days", caption: "First snow" },
  { id: "birthdays", label: "Birthdays", caption: "Another year of you" },
  { id: "holidays", label: "Holidays", caption: "Home for the holidays" },
  { id: "car", label: "Car rides", caption: "Window down" },
  { id: "friends", label: "Friends", caption: "Best friends" },
  { id: "treats", label: "Treats", caption: "Good dog" },
  { id: "puppyhood", label: "Little years", caption: "When they were small" },
];

export const MAX_TAGS = 5;

// Known activities by id; anything else is a custom label, tidied up.
export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.replace(/\s+/g, " ").trim().slice(0, 24);
    if (tag && !out.some((t) => t.toLowerCase() === tag.toLowerCase())) out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}

export function activityFor(tag: string): Activity {
  return ACTIVITIES.find((a) => a.id === tag) ?? { id: tag, label: tag, caption: "" };
}
