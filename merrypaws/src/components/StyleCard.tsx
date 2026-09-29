import type { Style } from "@/lib/styles";

export function StyleArt({ style, sample }: { style: Style; sample: string | null }) {
  if (sample) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={sample} alt={style.name} className="aspect-[4/5] w-full object-cover" />;
  }
  return (
    <div className={`flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br ${style.gradient} text-5xl`}>
      <span aria-hidden>{style.emoji}</span>
    </div>
  );
}
