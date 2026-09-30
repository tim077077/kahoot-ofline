// Film looks for the album: a non-destructive filter over every photo, so an
// ordinary phone picture reads like a print from an old shoebox. The originals
// are never changed.

export type LookId = "original" | "summer" | "faded" | "golden" | "sepia" | "silver";

export type Look = { id: LookId; label: string; filter: string; free: boolean };

export const LOOKS: Look[] = [
  { id: "original", label: "Original", filter: "none", free: true },
  { id: "summer", label: "Summer", filter: "sepia(0.22) saturate(1.12) contrast(1.04) brightness(1.03) hue-rotate(-6deg)", free: true },
  { id: "faded", label: "Faded '70s", filter: "sepia(0.35) saturate(0.78) contrast(0.88) brightness(1.08)", free: false },
  { id: "golden", label: "Golden hour", filter: "sepia(0.4) saturate(1.35) hue-rotate(-14deg) contrast(1.06)", free: false },
  { id: "sepia", label: "Sepia", filter: "sepia(0.9) contrast(1.05) brightness(1.02)", free: false },
  { id: "silver", label: "Silver", filter: "grayscale(1) contrast(1.15) brightness(1.03)", free: false },
];

export function findLook(id: unknown): Look {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[1];
}
