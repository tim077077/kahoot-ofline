// Prompt building is the product. Every prompt pins the architecture so the
// result is still an honest photo of the same room.

export const MODES = ["stage", "empty", "restyle"] as const;
export type Mode = (typeof MODES)[number];

export const ROOMS = ["living", "bedroom", "kitchen", "dining", "office", "kids", "bathroom", "balcony"] as const;
export type Room = (typeof ROOMS)[number];

export const STYLES = ["modern", "scandinavian", "minimalist", "industrial", "luxury", "classic", "boho", "japandi"] as const;
export type Style = (typeof STYLES)[number];

const ROOM_TEXT: Record<Room, string> = {
  living: "living room",
  bedroom: "bedroom",
  kitchen: "kitchen",
  dining: "dining room",
  office: "home office",
  kids: "children's bedroom",
  bathroom: "bathroom",
  balcony: "balcony or terrace",
};

const STYLE_TEXT: Record<Style, string> = {
  modern: "modern contemporary style with clean lines, neutral tones and warm wood accents",
  scandinavian: "Scandinavian style with light wood, white and beige textiles, cozy and airy",
  minimalist: "minimalist style with very few carefully chosen pieces and a calm neutral palette",
  industrial: "industrial loft style with black metal, leather, reclaimed wood and exposed textures",
  luxury: "luxury high-end style with elegant designer furniture, marble, brass and velvet accents",
  classic: "classic timeless style with traditional furniture, moldings-friendly decor and rich fabrics",
  boho: "bohemian style with rattan, plants, layered rugs and warm earthy colors",
  japandi: "Japandi style mixing Japanese and Scandinavian design, low furniture, natural materials",
};

const KEEP_ARCHITECTURE =
  "Keep the room architecture exactly the same: walls, wall colors, windows, doors, floor, ceiling, radiators, outlets, built-in fixtures, room proportions, lighting direction and the camera angle must not change. Do not add or remove windows or doors.";

const PHOTO_QUALITY =
  "The result must look like a real professional real-estate photograph: photorealistic, correct perspective and scale, natural soft daylight, realistic shadows. No text, no watermark, no people.";

export function buildPrompt(mode: Mode, room: Room, style: Style): string {
  const roomText = ROOM_TEXT[room];
  const styleText = STYLE_TEXT[style];

  switch (mode) {
    case "stage":
      return [
        `Virtually stage this ${roomText}: furnish and decorate it in ${styleText}.`,
        `Add furniture and decor that a buyer would expect in a ${roomText}, sized realistically for the space and placed so walkways stay clear.`,
        KEEP_ARCHITECTURE,
        PHOTO_QUALITY,
      ].join(" ");
    case "empty":
      return [
        `Remove all furniture, rugs, clutter, personal items and loose decor from this ${roomText}, leaving it completely empty and clean.`,
        "Reconstruct the floor and walls that were hidden behind the removed items so they match the visible surfaces.",
        KEEP_ARCHITECTURE,
        PHOTO_QUALITY,
      ].join(" ");
    case "restyle":
      return [
        `Replace the existing furniture and decor in this ${roomText} with new furniture in ${styleText}.`,
        "Remove clutter and personal items. Keep the same general layout of the room.",
        KEEP_ARCHITECTURE,
        PHOTO_QUALITY,
      ].join(" ");
  }
}

export function parseOptions(input: { mode?: unknown; room?: unknown; style?: unknown }) {
  const mode = MODES.find((m) => m === input.mode);
  const room = ROOMS.find((r) => r === input.room);
  const style = STYLES.find((s) => s === input.style);
  if (!mode || !room || !style) return null;
  return { mode, room, style };
}
