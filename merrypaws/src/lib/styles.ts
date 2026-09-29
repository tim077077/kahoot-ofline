// The films your pet can star in. Every prompt insists on keeping the pet
// (and the owner, when present) recognisable: an owner forgives a cheesy set,
// never "that's not my dog".

export type StyleId =
  | "royal-court"
  | "film-noir"
  | "technicolor"
  | "silent-era"
  | "western"
  | "new-wave"
  | "space-age"
  | "holiday-special";

export type Style = {
  id: StyleId;
  // Shown as a film title: "LUNA in THE ROYAL COURT".
  title: string;
  year: number;
  blurb: string;
  scene: string;
  // Card tone before real example stills exist: two colours of the film stock.
  tone: [string, string];
};

export const STYLES: Style[] = [
  {
    id: "royal-court",
    title: "The Royal Court",
    year: 1654,
    blurb: "Old-master oil portrait. Velvet, ermine, a small crown.",
    scene:
      "as a regal old-master oil painting from the 1650s: a red velvet cape with ermine trim, a small golden crown, a dark painted backdrop, candlelight, rich visible brushwork and craquelure",
    tone: ["#3a1d12", "#b8862c"],
  },
  {
    id: "film-noir",
    title: "The Long Night",
    year: 1947,
    blurb: "Black and white noir. Venetian blind shadows, rain on the glass.",
    scene:
      "as a 1940s film noir still in high-contrast black and white: hard key light through venetian blinds, cigarette-smoke haze, rain on a window, a fedora and trench coat",
    tone: ["#0e0e10", "#6d6f75"],
  },
  {
    id: "technicolor",
    title: "Stars Over Hollywood",
    year: 1954,
    blurb: "Three-strip Technicolor glamour on a studio set.",
    scene:
      "as a 1950s three-strip Technicolor studio glamour portrait: saturated jewel colours, soft Hollywood beauty lighting, a painted studio backdrop, a satin bow tie or pearls",
    tone: ["#6b1030", "#e0a13a"],
  },
  {
    id: "silent-era",
    title: "The Gentle Tramp",
    year: 1925,
    blurb: "Silent-film sepia, iris vignette, a bowler hat.",
    scene:
      "as a 1920s silent-film still: warm sepia tone, an iris vignette, flickering orthochromatic film texture, a bowler hat and bow tie, theatrical pose",
    tone: ["#2b1f14", "#a88b62"],
  },
  {
    id: "western",
    title: "Dust at Sundown",
    year: 1962,
    blurb: "Widescreen western. Cowboy hat, golden hour, dust.",
    scene:
      "as a 1960s widescreen western film still: golden-hour desert light, drifting dust, a cowboy hat and neckerchief, weathered wooden saloon behind, Kodachrome colour",
    tone: ["#5a2a12", "#e2a15a"],
  },
  {
    id: "new-wave",
    title: "Paris, Toujours",
    year: 1960,
    blurb: "French New Wave. Black and white street, striped shirt.",
    scene:
      "as a 1960 French New Wave black and white film still on a Paris street: candid handheld framing, a Breton striped shirt and beret, cafe chairs, natural daylight, 35mm grain",
    tone: ["#15171a", "#9aa0a6"],
  },
  {
    id: "space-age",
    title: "Voyage to the Dog Star",
    year: 1968,
    blurb: "Retro sci-fi set. Silver suit, bubble helmet, painted planets.",
    scene:
      "as a 1960s retro science-fiction film still: a silver space suit with a clear bubble helmet, a painted starfield and ringed planet backdrop, colored gel lighting, Ektachrome colour",
    tone: ["#0f1a3a", "#7fb5d9"],
  },
  {
    id: "holiday-special",
    title: "A Very Merry Christmas",
    year: 1955,
    blurb: "1950s holiday special. Fireplace, stockings, a red scarf.",
    scene:
      "as a 1950s Christmas film still in Kodachrome colour: a crackling fireplace, stockings on the mantel, a decorated tree with glowing bulbs, a red knitted scarf, cozy and warm",
    tone: ["#3d0f0f", "#d9b25c"],
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
  "Cinematic film still, shot on period-accurate film stock with authentic grain, beautiful lighting and composition, vertical portrait framing. No text, no letters, no logos, no watermark, no extra animals or people.";

export function buildPortraitPrompt(style: Style, withOwner: boolean): string {
  if (withOwner) {
    return [
      "Create a film still starring the person from the second image together with the pet from the first image,",
      `the person holding or sitting close to the pet, ${style.scene}.`,
      LIKENESS,
      OWNER_LIKENESS,
      QUALITY,
    ].join(" ");
  }
  return [`Create a film still starring the pet from the image, ${style.scene}.`, LIKENESS, QUALITY].join(" ");
}
