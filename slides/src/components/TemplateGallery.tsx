"use client";

import Link from "next/link";
import { useState } from "react";
import { TemplatePreview } from "@/components/TemplatePreview";
import { byHeat, CATEGORIES, TEMPLATES, type Category } from "@/lib/templates";

export function TemplateGallery() {
  const [category, setCategory] = useState<Category | "All">("All");
  const shown = byHeat(category === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === category));

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {(["All", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${category === c ? "bg-ink text-white" : "border border-line bg-card"}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {shown.map((t, i) => (
          <Link key={t.id} href={`/editor?t=${t.id}`} className="group overflow-hidden rounded-2xl border border-line bg-card">
            <div className="relative">
              <TemplatePreview template={t} />
              <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                {category === "All" && i < 3 ? `🔥 #${i + 1}` : `🔥 ${t.heat}`}
              </span>
            </div>
            <div className="p-3">
              <p className="font-semibold leading-tight group-hover:text-accent">{t.name}</p>
              <p className="mt-1 text-xs text-muted">{t.whyItWorks}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
