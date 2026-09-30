// The eras your pet can be portrayed in, and the prompts behind them.
//
// How the prompts are written (image-edit models follow described scenes far
// better than keyword lists):
// 1. Say what the picture physically is (an oil painting, a 35mm still).
// 2. Identity first, in detail: an owner forgives a cheesy set, never
//    "that's not my dog". The era lives in the wardrobe, set, light and
//    medium, never in the pet's face or body.
// 3. Then the scene in concrete, photographic language: wardrobe, set, pose,
//    light, lens and framing, palette, surface texture, mood.
// 4. Close with the output rules and what to avoid for this era.
//
// No trademarks anywhere: no film stock brands, studios, or artists' names.
// Change a prompt here, then run `npm run lab` on your test photos before
// shipping it (see README, "Prompt lab").

export type StyleId = "royal-court" | "family-album" | "golden-age" | "film-noir" | "silent-era" | "holiday-special";

// The costume Biscuit wears on the style card until real example stills exist.
export type Costume = "crown" | "none" | "pearls" | "fedora" | "boater" | "scarf";

export type Style = {
  id: StyleId;
  // Shown as a title card: "Luna in The Royal Court, 1654".
  title: string;
  year: number;
  blurb: string;
  costume: Costume;
  prompt: {
    // What the finished picture physically is.
    medium: string;
    // Worn by the pet. Never anything that covers the eyes or muzzle.
    wardrobe: string;
    // Worn by the owner when they're in the picture.
    ownerWardrobe: string;
    set: string;
    // How the pet sits in the frame, alone and with the owner.
    pose: string;
    ownerPose: string;
    light: string;
    camera: string;
    palette: string;
    texture: string;
    mood: string;
    // Era-specific things that go wrong.
    avoid: string;
  };
};

export const STYLES: Style[] = [
  {
    id: "royal-court",
    title: "The Royal Court",
    year: 1654,
    blurb: "An old-master oil portrait. Velvet, ermine, candlelight.",
    costume: "crown",
    prompt: {
      medium:
        "a 17th-century old-master oil painting on canvas, the kind of formal court portrait that hangs in a palace gallery",
      wardrobe:
        "a deep crimson velvet cape with a broad white ermine collar with small black tail spots, fastened with a gold brooch, and a small gold crown set with a single ruby resting between the ears",
      ownerWardrobe:
        "rich 1650s court dress in dark velvet with a white lace collar and cuffs, and a gold chain across the chest",
      set: "a dark, warm painted backdrop that fades from umber to black, a heavy draped curtain in deep red on one side, and a velvet cushion with gold tassels",
      pose: "seated upright and proud on the velvet cushion, facing three-quarters toward the viewer, head high, gaze steady and dignified",
      ownerPose:
        "the person seated in a carved high-backed chair with the pet on their lap or on a cushion beside them, one hand resting gently on the pet",
      light:
        "a single warm window light from the upper left, strong chiaroscuro, the face and chest glowing out of deep shadow, soft falloff into darkness",
      camera: "eye-level, a classic vertical portrait composition with the subject centred slightly low and generous dark space above",
      palette: "crimson, gold, ivory, umber and near-black, with warm varnish-yellowed highlights",
      texture:
        "visible confident brushstrokes, thick impasto in the highlights, thin glazes in the shadows, fine craquelure across the aged varnish, and individual strands of fur painted with care",
      mood: "noble, serious and a little humorous in its grandeur",
      avoid: "no gold picture frame, no plaque, no modern objects, no cartoon or illustration look, no smooth digital airbrushing",
    },
  },
  {
    id: "family-album",
    title: "Summer of '72",
    year: 1972,
    blurb: "A faded family snapshot from a long, warm summer.",
    costume: "none",
    prompt: {
      medium: "a genuine 1970s amateur family snapshot, printed on square instant-photo paper and kept in an album for fifty years",
      wardrobe: "a simple cotton bandana around the neck, or nothing at all, so the pet looks exactly like themselves",
      ownerWardrobe:
        "casual early-1970s summer clothes: a patterned short-sleeve shirt or a sundress, relaxed hair, nothing costume-like",
      set: "a sunlit back garden or front porch in late afternoon: overgrown grass, a wooden step, a garden chair, soft trees behind",
      pose: "relaxed and natural, caught mid-moment looking just past the camera, as if someone had just called their name",
      ownerPose:
        "the person sitting on the porch step with an arm around the pet, both squinting a little into the sun, candid and affectionate",
      light:
        "low golden late-afternoon sun from behind one side, warm rim light on the fur, a soft lens flare, gentle haze",
      camera:
        "a cheap fixed-lens camera held at chest height, slightly off-centre framing, soft focus at the edges, the pet sharp enough to recognise every marking",
      palette:
        "faded colour that has shifted toward warm amber and soft teal, lifted blacks, creamy highlights, gently desaturated greens",
      texture: "fine film grain, slight colour bleed, a thin white border around the square image, very faint dust specks",
      mood: "tender, nostalgic, a warm memory of a summer that felt endless",
      avoid: "no modern phones, cars or logos, no posed studio look, no heavy vignette, no sharp digital clarity",
    },
  },
  {
    id: "golden-age",
    title: "Evening in Pearls",
    year: 1954,
    blurb: "Studio glamour from the golden age of colour film.",
    costume: "pearls",
    prompt: {
      medium: "a 1950s studio glamour portrait shot on saturated three-strip colour film, like a publicity still for a new picture",
      wardrobe: "a single strand of lustrous pearls around the neck, or a black satin bow tie for a more dapper look",
      ownerWardrobe:
        "1950s evening wear: a satin gown with pearls and softly set waves, or a tailored dinner jacket with a crisp white shirt and bow tie",
      set: "a painted studio backdrop in a soft rose-to-plum gradient, with a swag of velvet drapery and a chaise longue in deep teal",
      pose: "a composed glamour pose on the chaise, chin slightly lifted, head turned three-quarters, eyes catching the light",
      ownerPose:
        "the person seated on the chaise with the pet beside them or held close to the cheek, both turned toward the camera like co-stars",
      light:
        "classic studio beauty lighting: a soft key light high and to one side, a gentle fill, a hair light that makes the fur glow, catchlights in the eyes",
      camera: "a large-format studio camera, medium close-up, vertical framing, shallow depth of field, the backdrop softly out of focus",
      palette: "jewel tones: ruby, sapphire, emerald and rose, creamy skin and fur tones, rich but clean blacks",
      texture: "smooth fine grain, the slightly dreamy glow of a diffusion filter, lush saturated colour",
      mood: "glamorous, warm and a touch playful, the star of the studio",
      avoid: "no modern makeup trends, no neon, no text or credits, no over-sharpened skin or fur",
    },
  },
  {
    id: "film-noir",
    title: "The Long Night",
    year: 1947,
    blurb: "Black and white noir. Blind shadows, rain on the glass.",
    costume: "fedora",
    prompt: {
      medium: "a 1940s film noir still in rich high-contrast black and white, printed from the original negative",
      wardrobe: "a grey felt fedora tilted slightly over one ear, with the pet's eyes and face fully visible beneath the brim",
      ownerWardrobe: "a belted trench coat with the collar turned up and a fedora, or a dark 1940s dress with a small hat",
      set: "a detective's office at night: a wooden desk, a desk lamp, a rain-streaked window with the city's lights blurred behind it",
      pose: "sitting on the desk, turned toward the window, then looking back over the shoulder at the camera with a knowing gaze",
      ownerPose:
        "the person leaning against the desk beside the pet, both looking toward the camera, the pet close enough to touch",
      light:
        "hard low-key lighting, a single source through venetian blinds throwing striped shadows across the scene, the pet's face in a clean pool of light, deep blacks",
      camera: "a slightly low angle, a 40mm lens, vertical framing with strong diagonals, the subject sharp",
      palette: "true black and white only: inky blacks, silvery mid-greys, bright clean highlights",
      texture: "fine silver grain, a faint haze in the air, glistening rain on the glass",
      mood: "mysterious, moody and cool, the hero of the story",
      avoid: "no colour at all, no stripes of shadow across the eyes, no cigarettes, no weapons, no modern objects",
    },
  },
  {
    id: "silent-era",
    title: "The Little Wanderer",
    year: 1925,
    blurb: "Silent-film sepia with a soft iris vignette.",
    costume: "boater",
    prompt: {
      medium: "a still frame from a 1920s silent film, printed in warm sepia on aged photographic paper",
      wardrobe: "a small straw boater hat with a dark ribbon, and a neat black bow tie",
      ownerWardrobe: "1920s clothes: a waistcoat, rolled sleeves and a flat cap, or a drop-waist dress with a cloche hat",
      set: "a painted theatre backdrop of a park with a bench and a lamppost, like an early studio stage",
      pose: "a theatrical, slightly comic pose: sitting upright on the bench, head tilted, looking straight into the lens",
      ownerPose:
        "the person on the bench with the pet beside them, both looking into the lens with the same tilted, charming expression",
      light: "flat, even early-studio light from above, gentle and a little overexposed in the highlights",
      camera: "a hand-cranked film camera at eye level, a centred symmetrical composition, a soft circular iris vignette closing in at the corners",
      palette: "sepia: warm browns, creams and soft blacks, no other colour",
      texture: "orthochromatic film grain, faint vertical scratches, tiny dust specks, a softly flickering exposure",
      mood: "sweet, innocent and gently comic",
      avoid: "no intertitle cards or text, no modern colour, no heavy damage that hides the pet's face",
    },
  },
  {
    id: "holiday-special",
    title: "Home for Christmas",
    year: 1955,
    blurb: "A 1950s Christmas by the fire, in warm colour film.",
    costume: "scarf",
    prompt: {
      medium: "a 1950s Christmas family photograph on warm colour film, the kind kept in a shoebox and brought out every December",
      wardrobe: "a hand-knitted red scarf with white stripes, loosely wrapped around the neck",
      ownerWardrobe: "a cosy 1950s knitted jumper with a festive pattern, or a red cardigan over a white blouse",
      set: "a living room on Christmas Eve: a crackling fireplace with stockings on the mantel, a tree with big glowing coloured bulbs and tinsel, wrapped presents on a patterned rug",
      pose: "sitting on the rug in front of the tree among the presents, looking up at the camera with bright eyes",
      ownerPose:
        "the person sitting on the rug beside the tree with the pet in their arms or lap, both smiling toward the camera",
      light:
        "warm firelight from one side and the soft glow of the tree lights, a little flash fill on the faces, cosy pools of warm light and gentle shadows",
      camera: "eye-level at the pet's height, vertical framing, the tree lights softly out of focus as round bokeh",
      palette: "warm reds, deep greens, gold and cream, rich but slightly faded as old colour prints are",
      texture: "soft film grain, a warm cast, a gentle glow around the lights",
      mood: "cosy, joyful and full of love, a family Christmas",
      avoid: "no modern decorations or LED lights, no text, no Santa costume that covers the pet's head",
    },
  },
];

export function findStyle(id: unknown): Style | undefined {
  return STYLES.find((s) => s.id === id);
}

const PET_IDENTITY =
  "Keep the pet exactly recognisable: this must be the same individual animal, not just the same breed. Copy precisely their head shape and size, muzzle length, ear shape and how the ears sit, eye colour and eye shape, nose colour, coat colour, pattern and every marking (including any asymmetric patches, spots or a white blaze, on the correct side), coat length and texture, and body build. The same number of eyes, ears and legs. Paint or photograph the pet realistically in the era's medium; do not turn them into a cartoon, do not change their proportions, and do not make them look like a different breed.";

const OWNER_IDENTITY =
  "Keep the person exactly recognisable from their photo: the same face shape, features, skin tone, hair colour and style, age, facial hair and glasses if they wear them. Do not beautify, slim, de-age or change their identity; only their clothes, hair styling and surroundings follow the era.";

const OUTPUT =
  "Output one vertical 4:5 image with the whole pet in frame from the ears to the paws, nothing cropped. No text, letters, captions, logos, signatures or watermarks. No extra animals or people.";

export function buildPortraitPrompt(style: Style, withOwner: boolean): string {
  const p = style.prompt;
  const who = withOwner
    ? "It shows the pet from the first image together with the person from the second image."
    : "It shows the pet from the image as the sole subject.";

  return [
    `Turn the photo into ${p.medium}. ${who}`,
    PET_IDENTITY,
    withOwner ? OWNER_IDENTITY : "",
    `The pet wears ${p.wardrobe}.${withOwner ? ` The person wears ${p.ownerWardrobe}.` : ""}`,
    `The setting: ${p.set}. Pose: ${withOwner ? p.ownerPose : p.pose}.`,
    `Lighting: ${p.light}. Camera and framing: ${p.camera}.`,
    `Colour: ${p.palette}. Surface: ${p.texture}. The mood is ${p.mood}.`,
    OUTPUT,
    `Avoid: ${p.avoid}.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
