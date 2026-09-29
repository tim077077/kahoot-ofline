import type { Style } from "@/lib/styles";

// A film's "poster": the real example still when one exists, otherwise a
// title card in the film's own stock colours.
export function StyleArt({ style, sample, compact = false }: { style: Style; sample: string | null; compact?: boolean }) {
  if (sample) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sample} alt={style.title} className="aspect-[4/5] w-full object-cover" />;
  }
  return (
    <div
      className="relative flex aspect-[4/5] w-full flex-col items-center justify-center overflow-hidden p-2 text-center"
      style={{ background: `radial-gradient(120% 90% at 50% 20%, ${style.tone[1]} 0%, ${style.tone[0]} 72%)` }}
    >
      <span className={`font-marquee font-extrabold uppercase leading-[0.95] text-screen ${compact ? "text-sm" : "text-2xl"}`}>
        {style.title}
      </span>
      <span className={`font-script text-screen/70 ${compact ? "mt-0.5 text-[10px]" : "mt-2 text-xs"}`}>{style.year}</span>
    </div>
  );
}
