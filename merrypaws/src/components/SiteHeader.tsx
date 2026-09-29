import Link from "next/link";
import { BRAND } from "@/lib/config";

export function SiteHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="font-display text-xl font-semibold">
          🐾 {BRAND}
        </Link>
        <div className="ml-auto flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}
