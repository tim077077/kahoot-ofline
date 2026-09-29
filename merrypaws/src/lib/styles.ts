// The portrait looks. Every prompt insists on keeping the pet recognisable:
// an owner forgives a cheesy background, never "that's not my dog".

export type StyleId =
  | "fireplace"
  | "santa"
  | "snowy-forest"
  | "royal"
  | "vintage-card"
  | "ugly-sweater"
  | "gingerbread"
  | "winter-window";

export type Style = { id: StyleId; name: string; blurb: string; scene: string; gradient: string; emoji: string };

export const STYLES: Style[] = [
  {
    id: "fireplace",
    name: "Cozy fireplace",
    blurb: "Curled up by the fire, stockings hung",
    scene:
      "curled up on a chunky knitted blanket in front of a crackling fireplace, Christmas stockings on the mantel, warm golden glow, bokeh fairy lights",
    gradient: "from-amber-700 to-red-900",
    emoji: "🔥",
  },
  {
    id: "santa",
    name: "Santa's little helper",
    blurb: "Santa hat, presents, twinkling tree",
    scene:
      "wearing a small red Santa hat, sitting among wrapped presents under a decorated Christmas tree with twinkling lights",
    gradient: "from-red-600 to-rose-900",
    emoji: "🎅",
  },
  {
    id: "snowy-forest",
    name: "Snowy woodland",
    blurb: "Soft snowfall, red scarf, pine trees",
    scene:
      "in a snowy pine forest with gentle falling snow, wearing a cosy red knitted scarf, soft winter daylight",
    gradient: "from-sky-600 to-slate-800",
    emoji: "🌲",
  },
  {
    id: "royal",
    name: "Royal Christmas",
    blurb: "Old-master oil painting, velvet and gold",
    scene:
      "as a regal Renaissance oil-painting portrait, wearing a red velvet cape with ermine trim and a small golden crown, holly and candlelight, rich painterly brushwork",
    gradient: "from-yellow-700 to-red-950",
    emoji: "👑",
  },
  {
    id: "vintage-card",
    name: "Vintage card",
    blurb: "1950s illustrated greeting-card look",
    scene:
      "as a charming 1950s vintage illustrated Christmas greeting card, holly, snowflakes, soft painted textures, cream paper background",
    gradient: "from-emerald-700 to-red-800",
    emoji: "💌",
  },
  {
    id: "ugly-sweater",
    name: "Ugly sweater party",
    blurb: "Loud knitted sweater, party lights",
    scene:
      "wearing a hilarious colourful knitted Christmas sweater with reindeer patterns, at a festive party with string lights and tinsel",
    gradient: "from-green-600 to-red-700",
    emoji: "🧶",
  },
  {
    id: "gingerbread",
    name: "Gingerbread kitchen",
    blurb: "Cookies, flour and a very good helper",
    scene:
      "in a warm rustic kitchen surrounded by freshly baked gingerbread cookies, a little flour on the nose, cosy and playful",
    gradient: "from-orange-600 to-amber-900",
    emoji: "🍪",
  },
  {
    id: "winter-window",
    name: "Winter window",
    blurb: "Frosty window, snowy night outside",
    scene:
      "sitting at a frosty window looking out at a snowy night street with glowing Christmas lights, candles on the windowsill",
    gradient: "from-indigo-700 to-slate-900",
    emoji: "❄️",
  },
];

export function findStyle(id: unknown): Style | undefined {
  return STYLES.find((s) => s.id === id);
}

const LIKENESS =
  "Keep the pet exactly recognisable: same breed, fur colours, markings, eye colour, ear shape and face. Do not change the animal into a different breed.";
const OWNER_LIKENESS =
  "Keep the person exactly recognisable from their photo: same face, hair, skin tone and age. Do not beautify or change their identity.";
const QUALITY =
  "High quality, beautifully lit, heartwarming, vertical portrait composition. No text, no letters, no watermark, no extra animals or people.";

export function buildPortraitPrompt(style: Style, withOwner: boolean): string {
  if (withOwner) {
    return [
      "Create a Christmas portrait of the person from the second image together with the pet from the first image,",
      `the person lovingly holding or hugging the pet, ${style.scene}.`,
      LIKENESS,
      OWNER_LIKENESS,
      QUALITY,
    ].join(" ");
  }
  return [`Create a Christmas portrait of the pet from the image, ${style.scene}.`, LIKENESS, QUALITY].join(" ");
}
