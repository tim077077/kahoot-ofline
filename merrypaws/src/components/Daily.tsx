"use client";

import { Camera, InstagramLogo, Snowflake, UsersThree } from "@phosphor-icons/react";
import { Mascot } from "@/components/Mascot";
import { Sheet } from "@/components/Sheet";
import { Polaroid, Print, Tape } from "@/components/Vintage";
import type { Daily, DayCell, Photo } from "@/lib/client";
import { promptFor } from "@/lib/dailyPrompts";
import type { LookId } from "@/lib/looks";

// The streak as a strip of film: one frame per day. Done frames are exposed,
// frozen days show a snowflake, today waits with a dashed edge.
export function FilmRoll({ days, doneToday }: { days: DayCell[]; doneToday: boolean }) {
  const last7 = days.slice(-7);
  return (
    <div className="rounded-sm bg-[#2a1b14] px-1.5 py-1" aria-hidden>
      <div className="sprockets h-2 opacity-60" />
      <div className="my-1 grid grid-cols-7 gap-1">
        {last7.map((d, i) => {
          const isToday = i === last7.length - 1;
          const base = "flex aspect-[4/5] items-center justify-center rounded-[2px]";
          if (d.state === "done") return <span key={d.day} className={`${base} bg-[#e9b872]`} />;
          if (d.state === "frozen") return <span key={d.day} className={`${base} bg-[#b9d3e4] text-[#2a4a60]`}><Snowflake size={12} weight="bold" /></span>;
          if (d.state === "paused") return <span key={d.day} className={`${base} bg-[#8a7a6a]`} />;
          return <span key={d.day} className={`${base} ${isToday && !doneToday ? "border border-dashed border-[#e9d8b4]/80" : "bg-[#4a382c]"}`} />;
        })}
      </div>
      <div className="sprockets h-2 opacity-60" />
    </div>
  );
}

type CardProps = {
  name: string;
  daily: Daily | null;
  today: string;
  todayPhoto: Photo | null;
  look: LookId;
  busy: boolean;
  onAdd: () => void;
  onStory: () => void;
  onPack: () => void;
  onMakeRoom: () => void;
};

// Top of the album: today's prompt, the roll, and one button. Once today's
// photo is in, the card turns into a small celebration with the two things
// worth doing next: share it, or see the pack.
export function DailyCard({ name, daily, today, todayPhoto, look, busy, onAdd, onStory, onPack, onMakeRoom }: CardProps) {
  const count = daily?.count ?? 0;
  const done = daily?.doneToday ?? false;
  const who = name === "Your pet" ? "their" : `${name}'s`;

  return (
    <section className="mx-5 mt-6 rounded-2xl bg-card p-4 shadow-[0_14px_30px_-22px_var(--shadow)]" aria-label="Photo of the day">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-script text-[2rem] leading-[1.1]">{count > 0 ? `Day ${count}` : "Day one"}</p>
          <p className="font-display text-sm italic text-muted">of {who} photo-a-day roll</p>
        </div>
        {daily && daily.freezes > 0 && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#dfeaf1] px-2.5 py-1 text-xs text-[#2a4a60]" title="A freeze covers a missed day">
            <Snowflake size={14} weight="bold" /> {daily.freezes} {daily.freezes === 1 ? "freeze" : "freezes"}
          </span>
        )}
      </div>

      <div className="mt-3">{daily && <FilmRoll days={daily.days} doneToday={done} />}</div>

      {daily?.paused ? (
        <div className="mt-4">
          <p className="text-sm text-muted">The roll is paused while the album is full. Nothing is lost.</p>
          <button onClick={onMakeRoom} className="mt-3 min-h-12 w-full rounded-full bg-accent font-medium text-accent-ink">
            Make room to keep going
          </button>
        </div>
      ) : done ? (
        <div className="mt-4 flex items-center gap-4">
          {todayPhoto ? (
            <div className="relative w-20 shrink-0">
              <Print src={todayPhoto.thumb} look={look} rotate={-3} />
              <Tape className="-top-2 left-3 !h-4 !w-12" rotate={-10} />
            </div>
          ) : (
            <Mascot mood="cheer" size={64} />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">Today&apos;s photo is in.</p>
            <p className="text-sm text-muted">Tomorrow brings a new prompt.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {todayPhoto && (
                <button onClick={onStory} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm text-paper">
                  <InstagramLogo size={16} /> Story
                </button>
              )}
              <button onClick={onPack} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ink/20 px-3.5 text-sm">
                <UsersThree size={16} /> The pack
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted">Today&apos;s prompt</p>
          <p className="font-hand text-xl leading-normal">{promptFor(today)}</p>
          <button
            onClick={onAdd}
            disabled={busy}
            className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-ink active:scale-[0.98] disabled:opacity-60"
          >
            <Camera size={20} weight="bold" /> {busy ? "Developing" : "Add today's photo"}
          </button>
          {count > 0 && <p className="mt-2 text-center text-xs text-muted">Keeps the roll going. Any photo you add today counts.</p>}
        </div>
      )}
    </section>
  );
}

// "A year ago today": the album hands back a memory. Uses the same month and
// day in earlier years, or the same day last month while the album is young.
export function findMemory(photos: Photo[], today: string): { photo: Photo; label: string } | null {
  const [y, m, d] = today.split("-").map(Number);
  const sameDay = photos.filter((p) => {
    const t = new Date(p.takenAt);
    return t.getMonth() + 1 === m && t.getDate() === d && t.getFullYear() < y;
  });
  if (sameDay.length) {
    const photo = sameDay[0];
    const years = y - new Date(photo.takenAt).getFullYear();
    return { photo, label: years === 1 ? "A year ago today" : `${years} years ago today` };
  }
  const monthAgo = photos.find((p) => {
    const t = new Date(p.takenAt);
    const prev = new Date(y, m - 2, d);
    return t.getFullYear() === prev.getFullYear() && t.getMonth() === prev.getMonth() && t.getDate() === prev.getDate();
  });
  return monthAgo ? { photo: monthAgo, label: "A month ago today" } : null;
}

export function MemoryCard({ memory, look, onOpen }: { memory: { photo: Photo; label: string }; look: LookId; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center gap-4 rounded-2xl border border-dashed border-ink/20 p-3 text-left">
      {/* Percent padding follows the parent's width, so the print gets its own box. */}
      <span className="block w-20 shrink-0">
        <Polaroid src={memory.photo.thumb} look={look} rotate={3} />
      </span>
      <span className="min-w-0">
        <span className="font-display block text-lg italic">{memory.label}</span>
        <span className="font-hand block truncate text-base leading-normal text-muted">
          {memory.photo.caption || new Date(memory.photo.takenAt).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </span>
    </button>
  );
}

const MILESTONE_COPY: Record<number, string> = {
  3: "Three days in a row. That's how habits start.",
  7: "A whole week of them. You've got a roll going.",
  14: "Two weeks. This is becoming your thing.",
  30: "A month of photos. Future you will be so glad.",
  50: "Fifty days. That's a real record of a life.",
  100: "One hundred days. Frame this one.",
  200: "Two hundred days of love, kept.",
  365: "A year, every single day. Remarkable.",
};

// A milestone: a moment worth marking, with the roll so far and a way to
// share it. Shown once per milestone.
export function MilestoneSheet({ count, name, photos, look, onSee, onStory, onClose }: {
  count: number;
  name: string;
  photos: Photo[];
  look: LookId;
  onSee: () => void;
  onStory: () => void;
  onClose: () => void;
}) {
  const shown = photos.slice(0, 3);
  return (
    <Sheet label={`${count} days`} onClose={onClose}>
      <div className="text-center">
        <div className="relative mx-auto h-40 w-56">
          {shown.map((p, i) => (
            <div key={p.id} className={`drop absolute top-2 w-28 ${["left-0", "right-0", "left-14"][i]}`} style={{ animationDelay: `${i * 160}ms` }}>
              <Polaroid src={p.thumb} look={look} rotate={[-8, 6, -2][i]} />
            </div>
          ))}
          {shown.length === 0 && <Mascot mood="cheer" size={110} className="mx-auto" />}
        </div>
        <p className="font-script mt-4 text-[3.2rem] leading-[1.05]">{count} days</p>
        <p className="font-display italic text-muted">of {name}</p>
        <p className="mx-auto mt-3 max-w-[30ch]">{MILESTONE_COPY[count] ?? "Another milestone on the roll."}</p>
        <div className="mt-6 grid gap-2">
          <button onClick={onSee} className="min-h-13 rounded-full bg-accent font-medium text-accent-ink">
            See the roll
          </button>
          <button onClick={onStory} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-ink/25 font-medium">
            <InstagramLogo size={18} /> Share to your story
          </button>
        </div>
      </div>
    </Sheet>
  );
}
