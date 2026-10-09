import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/config";

const LINKS = [
  { href: "/", label: "Dashboard", id: "dashboard" },
  { href: "/studio", label: "Studio", id: "studio" },
  { href: "/find", label: "Viral finder", id: "find" },
  { href: "/posts", label: "My posts", id: "posts" },
] as const;

export type Page = (typeof LINKS)[number]["id"];

export function Nav({ current, right }: { current: Page; right?: ReactNode }) {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          {BRAND}
        </Link>
        <nav className="-mx-1 flex gap-1 overflow-x-auto">
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              aria-current={current === l.id ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-semibold ${current === l.id ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        {right && <div className="ml-auto hidden min-w-0 truncate text-sm text-muted sm:block">{right}</div>}
      </div>
    </header>
  );
}
