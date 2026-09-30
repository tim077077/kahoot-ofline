import type { CSSProperties, ReactNode } from "react";
import { dateStamp } from "@/lib/client";
import { DECKLE_MASK } from "@/lib/deckle";
import { findLook, type LookId } from "@/lib/looks";

// The album's physical vocabulary: prints with deckled edges, instant photos,
// masking tape and burned-in date stamps. Photos carry the film look and the
// grain; nothing here ever sits on top of body text.

type PhotoProps = {
  src: string;
  alt?: string;
  look?: LookId;
  // ISO date for the orange stamp, or nothing.
  date?: string | null;
  // Degrees. Real albums are a little crooked.
  rotate?: number;
  className?: string;
  imgClassName?: string;
  aspect?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

function Photo({ src, alt = "", look, date, imgClassName = "", aspect = "aspect-[4/5]" }: PhotoProps) {
  return (
    <div className={`grain relative overflow-hidden ${aspect}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${imgClassName}`} style={{ filter: findLook(look).filter }} />
      {date && <span className="datestamp absolute bottom-[5%] right-[6%] text-[0.7rem]">{dateStamp(date)}</span>}
    </div>
  );
}

// A deckle-edged print: the wavy hand-cut border of a 1950s photo.
export function Print(props: PhotoProps) {
  const { rotate = 0, className = "", children, style } = props;
  return (
    <div className={`relative ${className}`} style={{ ...style, transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      <div className="drop-shadow-[0_10px_14px_rgba(58,34,20,0.28)]">
        <div className="bg-[#fbf8f2] p-[6%]" style={{ maskImage: DECKLE_MASK, WebkitMaskImage: DECKLE_MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }}>
          <Photo {...props} />
        </div>
      </div>
      {children}
    </div>
  );
}

// An instant photo with a handwritten line on the bottom margin.
export function Polaroid(props: PhotoProps & { caption?: string }) {
  const { rotate = 0, className = "", caption, children, style } = props;
  return (
    <div className={`polaroid relative ${className}`} style={{ ...style, transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      <Photo {...props} aspect={props.aspect ?? "aspect-square"} />
      {caption && (
        <p className="font-hand absolute inset-x-[7%] bottom-[5%] truncate text-center text-[0.8rem] leading-normal text-[#3a2a20]">{caption}</p>
      )}
      {children}
    </div>
  );
}

export function Tape({ className = "", rotate = -4, style }: { className?: string; rotate?: number; style?: CSSProperties }) {
  return <span aria-hidden className={`tape ${className}`} style={{ ...style, transform: `rotate(${rotate}deg)` }} />;
}

// A little stack of prints for a highlight's cover.
export function Stack({ srcs, look, label }: { srcs: string[]; look?: LookId; label: string }) {
  const shown = srcs.slice(0, 3);
  const turns = [-7, 5, -1];
  return (
    <div className="relative mx-auto aspect-square w-full">
      {shown.length === 0 && <div className="absolute inset-[12%] rounded-sm border-2 border-dashed border-line" />}
      {shown.map((src, i) => (
        <div
          key={src}
          className="absolute inset-[10%] bg-[#fbf8f2] p-[6%] shadow-[0_6px_14px_-6px_rgba(58,34,20,0.45)]"
          style={{ transform: `rotate(${turns[(i + 3 - shown.length) % 3]}deg)`, zIndex: i }}
        >
          <Photo src={src} look={look} aspect="aspect-square" alt={i === shown.length - 1 ? label : ""} />
        </div>
      ))}
    </div>
  );
}

// "October 2025" (or just the year), handwritten on the album page.
export function MonthHeading({ date, yearOnly = false }: { date: string; yearOnly?: boolean }) {
  const d = new Date(date);
  return (
    <h3 className="flex items-center gap-3 px-5 text-muted">
      {yearOnly ? (
        <span className="font-hand text-xl leading-normal text-ink">{d.getFullYear()}</span>
      ) : (
        <>
          <span className="font-hand text-lg leading-normal text-ink">{d.toLocaleString("en", { month: "long" })}</span>
          <span className="font-display italic">{d.getFullYear()}</span>
        </>
      )}
      <span className="h-px flex-1 bg-line" aria-hidden />
    </h3>
  );
}
