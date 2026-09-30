import { Mascot } from "@/components/Mascot";
import type { Style, StyleId } from "@/lib/styles";

// Each era's look, applied to Biscuit on a period backdrop. Honest sample art
// until you drop real example stills into public/styles/<id>.jpg.
const LOOK: Record<StyleId, { bg: string; filter: string; overlay?: string }> = {
  "royal-court": {
    bg: "radial-gradient(90% 70% at 50% 35%, #6b4526 0%, #2a1a10 70%, #140c07 100%)",
    filter: "sepia(0.2) saturate(1.15) contrast(1.05)",
    overlay: "radial-gradient(80% 70% at 50% 45%, transparent 55%, rgba(10,5,2,0.55) 100%)",
  },
  "family-album": {
    bg: "linear-gradient(180deg, #f0cf9c 0%, #e8b98a 45%, #9fbfb6 100%)",
    filter: "sepia(0.35) saturate(0.85) brightness(1.04)",
    overlay: "linear-gradient(160deg, rgba(255,214,150,0.35), transparent 40%)",
  },
  "golden-age": {
    bg: "radial-gradient(90% 80% at 50% 30%, #d46a86 0%, #7c2c63 55%, #2e1540 100%)",
    filter: "saturate(1.3) contrast(1.05)",
  },
  "film-noir": {
    bg: "linear-gradient(180deg, #8a8a8a, #3a3a3a)",
    filter: "grayscale(1) contrast(1.45)",
    overlay: "repeating-linear-gradient(-28deg, rgba(0,0,0,0) 0 14px, rgba(0,0,0,0.42) 14px 26px)",
  },
  "silent-era": {
    bg: "radial-gradient(80% 70% at 50% 40%, #e2cba4 0%, #a98a5f 70%)",
    filter: "sepia(1) contrast(1.1)",
    overlay: "radial-gradient(closest-side, transparent 70%, rgba(20,12,4,0.9) 100%)",
  },
  "holiday-special": {
    bg: "radial-gradient(circle at 20% 25%, #f4c66a 0 3px, transparent 4px), radial-gradient(circle at 78% 18%, #f4c66a 0 4px, transparent 5px), radial-gradient(circle at 70% 60%, #f7d98f 0 3px, transparent 4px), radial-gradient(circle at 15% 70%, #f7d98f 0 2px, transparent 3px), radial-gradient(90% 80% at 50% 40%, #8e2a22 0%, #3a0f0c 100%)",
    filter: "saturate(1.1)",
  },
};

type Props = { style: Style; sample: string | null; className?: string; mascotSize?: number };

// The era's "sample print" in an arch frame.
export function StyleArt({ style, sample, className = "", mascotSize = 96 }: Props) {
  const look = LOOK[style.id];
  return (
    <div className={`arch grain relative aspect-[4/5] w-full overflow-hidden ${className}`}>
      {sample ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={sample} alt={`Example: ${style.title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-end justify-center" style={{ background: look.bg, filter: look.filter }}>
          <Mascot size={mascotSize} costume={style.costume} still className="mb-[6%]" />
          {look.overlay && <div className="absolute inset-0" style={{ background: look.overlay }} />}
        </div>
      )}
    </div>
  );
}
