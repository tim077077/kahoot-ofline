// Today's prompt for the photo of the day. A different small idea every day
// keeps the habit fresh (and a little unpredictable) without asking much.

export const DAILY_PROMPTS = [
  "Their sleepy face",
  "Paws, up close",
  "The spot they always nap",
  "Mid-zoom, blurry is fine",
  "Waiting for dinner",
  "Their favourite toy",
  "Looking out the window",
  "Ears in the wind",
  "The head tilt",
  "Their nose, very close",
  "Where they wait for you",
  "Their best friend",
  "After a bath",
  "On a walk, from behind",
  "The begging face",
  "Curled up in a ball",
  "Their tail, mid-wag",
  "In the car",
  "With their bowl",
  "A yawn, if you're quick",
  "Their eyes in daylight",
  "Belly up",
  "In their bed",
  "On your lap",
  "Muddy paws",
  "Something they stole",
  "Their shadow",
  "At the door",
  "In the sun",
  "Their whiskers",
  "Mid-play",
  "The way they sit",
  "With a leaf or a stick",
  "Their collar or tag",
  "Your feet and their paws",
  "The first thing this morning",
  "Tired after the day",
  "Their silliest face",
  "From their eye level",
  "Just them, being them",
];

export function promptFor(day: string) {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return DAILY_PROMPTS[h % DAILY_PROMPTS.length];
}
