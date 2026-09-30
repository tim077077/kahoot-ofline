"use client";

import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { ACTIVITIES, activityFor, MAX_TAGS } from "@/lib/activities";

// After picking photos: one optional question, so the batch lands in the
// right highlights. Photos from one outing usually share an activity.
export function AddPhotosSheet({ count, name, recent, onAdd, onClose }: {
  count: number;
  name: string;
  recent: string[];
  onAdd: (tags: string[]) => void;
  onClose: () => void;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const custom_tags = recent.filter((t) => !ACTIVITIES.some((a) => a.id === t));
  const toggle = (tag: string) =>
    setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : t.length < MAX_TAGS ? [...t, tag] : t));

  return (
    <Sheet label="Add photos" onClose={onClose}>
      <h2 className="font-display text-[1.8rem] leading-tight">What was {name === "Your pet" ? "your pet" : name} up to?</h2>
      <p className="mt-1 text-muted">
        Optional. {count} {count === 1 ? "photo" : "photos"} will go into these highlights.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {[...ACTIVITIES.map((a) => a.id), ...custom_tags, ...tags.filter((t) => !ACTIVITIES.some((a) => a.id === t) && !custom_tags.includes(t))].map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggle(tag)}
              aria-pressed={on}
              className={on ? "dymo min-h-10" : "min-h-10 rounded-[3px] border border-dashed border-ink/30 px-2.5 text-[0.78rem] font-bold uppercase tracking-[0.14em] text-muted"}
            >
              {activityFor(tag).label}
            </button>
          );
        })}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const tag = custom.trim();
          if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) setTags([...tags, tag]);
          setCustom("");
        }}
      >
        <label htmlFor="batch-tag" className="sr-only">
          Your own highlight
        </label>
        <input
          id="batch-tag"
          value={custom}
          onChange={(e) => setCustom(e.target.value.slice(0, 24))}
          placeholder="Your own, like Lake trip 2024"
          className="min-h-11 flex-1 rounded-full border border-line bg-card px-4 text-sm outline-none focus:border-accent"
        />
      </form>
      <button
        onClick={() => onAdd(tags)}
        className="mt-6 flex min-h-14 w-full items-center justify-center rounded-full bg-accent text-lg font-medium text-accent-ink active:scale-[0.98]"
      >
        Add {count} {count === 1 ? "photo" : "photos"}
      </button>
    </Sheet>
  );
}
