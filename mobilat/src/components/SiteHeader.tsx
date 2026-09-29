import Link from "next/link";
import { BRAND, type Locale } from "@/lib/config";

export function SiteHeader({ lang, right, switchHref }: { lang: Locale; right?: React.ReactNode; switchHref: string }) {
  const other = lang === "ro" ? "en" : "ro";
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href={`/${lang}`} className="font-display text-xl font-semibold">
          {BRAND}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          {right}
          <Link
            href={switchHref}
            className="rounded-md px-2 py-1 text-sm font-medium uppercase text-muted hover:text-ink"
            aria-label={other === "ro" ? "Română" : "English"}
          >
            {other}
          </Link>
        </div>
      </div>
    </header>
  );
}
