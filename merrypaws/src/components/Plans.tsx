"use client";

import { Check, Copy, FilmStrip, Lock } from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import type { Account, PetKind } from "@/lib/client";
import { formatUsd, PACK_ORDER, PACKS, PAID_TIERS, TARGET_TIER, TIERS, type Interval, type PackId, type Tier } from "@/lib/config";
import { findLook, LOOKS, type LookId } from "@/lib/looks";

export type Purchase = { kind: "plan"; tier: Tier; interval: Interval } | { kind: "pack"; pack: PackId };
export type Busy = string | null;
const busyKey = (p: Purchase) => (p.kind === "plan" ? `${p.tier}-${p.interval}` : p.pack);

function perks(tier: Tier) {
  const t = TIERS[tier];
  const list: string[] = [];
  if (tier === TARGET_TIER) list.push(`A portrait every day (${t.hdPerMonth} a month, in HD)`);
  else if (t.hdPerMonth) list.push(`${t.hdPerMonth} HD portraits a month`);
  list.push(`${t.photos.toLocaleString()} photos in the album`);
  list.push(t.allLooks ? "Every film look" : "2 film looks");
  list.push(`${t.freezesPerMonth} streak ${t.freezesPerMonth === 1 ? "freeze" : "freezes"} a month`);
  list.push(t.previewsPerMonth ? `${t.previewsPerMonth} portrait tries a month` : "Your first portrait free");
  return list;
}

const savings = (tier: Tier) => Math.round((1 - TIERS[tier].price.year / (TIERS[tier].price.month * 12)) * 100);
const perDay = (cents: number, interval: Interval) => (cents / (interval === "year" ? 365 : 30)).toFixed(0);

// Three plans, the priciest first as the anchor and Plus in the middle,
// highlighted and ready to pick. Every price is the full price: no fake
// discounts, no countdowns (see PSYCHOLOGY.md).
export function PlanCards({ current, onBuy, busy }: { current: Tier; onBuy: (p: Purchase) => void; busy: Busy }) {
  const [interval, setInterval] = useState<Interval>("year");
  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full bg-sand p-1" role="radiogroup" aria-label="Billing">
        {(["month", "year"] as const).map((i) => (
          <button
            key={i}
            role="radio"
            aria-checked={interval === i}
            onClick={() => setInterval(i)}
            className={`min-h-10 rounded-full px-5 text-sm transition ${interval === i ? "bg-card font-medium shadow-sm" : "text-muted"}`}
          >
            {i === "month" ? "Monthly" : `Yearly, save ${savings(TARGET_TIER)}%`}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {PAID_TIERS.map((tier) => {
          const t = TIERS[tier];
          const price = t.price[interval];
          const isCurrent = current === tier;
          const featured = tier === TARGET_TIER;
          return (
            <div key={tier} className={`relative rounded-2xl bg-card p-5 ${featured ? "ring-2 ring-accent shadow-[0_18px_36px_-24px_var(--shadow)]" : "opacity-95"}`}>
              {featured && (
                <span className="dymo absolute -top-3 left-5" data-tone="red">
                  Most loved
                </span>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-2xl">{t.name}</h3>
                  <p className="font-hand text-sm leading-normal text-muted">{t.blurb}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-xl font-medium">
                    {formatUsd(price)}
                    <span className="text-sm font-normal text-muted">/{interval === "month" ? "mo" : "yr"}</span>
                  </span>
                  <span className="whitespace-nowrap text-sm text-muted">
                    {featured ? `about ${perDay(price, interval)}¢ a day` : interval === "year" ? `${formatUsd(Math.round(price / 12))} a month` : ""}
                  </span>
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {perks(tier).map((perk, k) => (
                  <li key={perk} className={`flex gap-2 text-[0.95rem] ${featured && k === 0 ? "font-medium" : ""}`}>
                    <Check size={18} weight="bold" className="mt-0.5 shrink-0 text-accent" /> {perk}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onBuy({ kind: "plan", tier, interval })}
                disabled={isCurrent || busy !== null}
                className={`mt-5 min-h-13 w-full rounded-full font-medium transition active:scale-[0.99] disabled:opacity-50 ${featured ? "bg-accent text-accent-ink" : "border border-ink/25"}`}
              >
                {isCurrent ? "Your plan" : busy === busyKey({ kind: "plan", tier, interval }) ? "Opening" : `Choose ${t.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted">Cancel anytime in two taps. Your photos stay in the album if you do.</p>
    </div>
  );
}

export function PackList({ onBuy, busy }: { onBuy: (p: Purchase) => void; busy: Busy }) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {PACK_ORDER.map((id) => {
        const pack = PACKS[id];
        return (
          <button
            key={id}
            onClick={() => onBuy({ kind: "pack", pack: id })}
            disabled={busy !== null}
            className={`perforated flex min-h-28 flex-col items-center justify-center rounded-lg px-2 py-3 text-center transition active:scale-[0.98] disabled:opacity-60 ${id === "p10" ? "bg-accent text-accent-ink" : "bg-card"}`}
          >
            <span className="font-display text-3xl leading-none">{pack.credits}</span>
            <span className="mt-1 text-xs uppercase tracking-[0.14em]">portraits</span>
            <span className="mt-2 font-medium">{busy === id ? "Opening" : formatUsd(pack.price)}</span>
          </button>
        );
      })}
    </div>
  );
}

export type SheetReason = "photos" | "hd" | "previews" | "looks";

const SHEET_COPY: Record<SheetReason, { title: (name: string) => string; body: string; packs: boolean }> = {
  photos: { title: (n) => `${n}'s album is full`, body: "Free albums hold 30 photos. Plans hold hundreds or thousands, and nothing you've added is ever removed.", packs: false },
  hd: { title: (n) => `Keep ${n} in HD`, body: "Full resolution, no watermark, ready to print or frame.", packs: true },
  previews: { title: () => "More portraits", body: "You've used your free portrait. Take a few more, or get some every month with a plan.", packs: true },
  looks: { title: () => "Every film look", body: "Faded '70s, golden hour, sepia and silver come with every plan.", packs: false },
};

export function PlansSheet({ reason, name, current, onBuy, busy, onClose }: {
  reason: SheetReason;
  name: string;
  current: Tier;
  onBuy: (p: Purchase) => void;
  busy: Busy;
  onClose: (dismissed: boolean) => void;
}) {
  const copy = SHEET_COPY[reason];
  return (
    <Sheet label={copy.title(name)} onClose={() => onClose(true)}>
      <div className="max-h-[78dvh] overflow-y-auto pb-2">
        <h2 className="font-display text-[1.8rem] leading-tight">{copy.title(name)}</h2>
        <p className="mt-1 text-muted">{copy.body}</p>
        {copy.packs && (
          <div className="mt-5">
            <PackList onBuy={onBuy} busy={busy} />
            <p className="font-display mt-6 text-center italic text-muted">or every month</p>
          </div>
        )}
        <div className="mt-4">
          <PlanCards current={current} onBuy={onBuy} busy={busy} />
        </div>
        <button onClick={() => onClose(true)} className="mt-2 min-h-12 w-full text-muted underline underline-offset-4">
          Not now
        </button>
      </div>
    </Sheet>
  );
}

export function LooksSheet({ look, allLooks, sample, onPick, onLocked, onClose }: {
  look: LookId;
  allLooks: boolean;
  sample: string | null;
  onPick: (id: LookId) => void;
  onLocked: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet label="Film look" onClose={onClose}>
      <h2 className="font-display text-[1.8rem] leading-tight">Film look</h2>
      <p className="mt-1 text-muted">Every photo in the album, as if it came from an old roll of film. Your originals never change.</p>
      <div className="mt-5 grid grid-cols-3 gap-3 pb-2">
        {LOOKS.map((l) => {
          const locked = !l.free && !allLooks;
          return (
            <button
              key={l.id}
              onClick={() => (locked ? onLocked() : onPick(l.id))}
              aria-pressed={look === l.id}
              className="text-center"
            >
              <span className={`relative block overflow-hidden rounded-md bg-[#fbf8f2] p-1.5 ${look === l.id ? "ring-2 ring-accent" : ""}`}>
                {sample ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sample} alt="" className="aspect-square w-full object-cover" style={{ filter: findLook(l.id).filter }} />
                ) : (
                  <span className="flex aspect-square items-center justify-center bg-sand" style={{ filter: findLook(l.id).filter }}>
                    <FilmStrip size={28} />
                  </span>
                )}
                {locked && (
                  <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-paper">
                    <Lock size={14} weight="bold" />
                  </span>
                )}
              </span>
              <span className="mt-1.5 block text-sm">{l.label}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

type YouProps = {
  account: Account | null;
  token: string | null;
  petName: string;
  kind: PetKind;
  onBuy: (p: Purchase) => void;
  busy: Busy;
  onProfile: (patch: { petName?: string; kind?: PetKind }) => void;
  onDeleteData: () => Promise<void>;
  onManage: () => void;
  memorial: boolean;
  onMemorial: (on: boolean) => void;
};

export function YouTab({ account, token, petName, kind, onBuy, busy, onProfile, onDeleteData, onManage, memorial, onMemorial }: YouProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(petName);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const tier = account?.tier ?? "free";
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/#k=${token}` : "";
  const used = account?.photos ?? 0;
  const limit = account?.photoLimit ?? TIERS.free.photos;

  return (
    <section className="px-5 pb-12 pt-2">
      <h1 className="font-display text-[2.4rem] leading-none">Membership</h1>

      <div className="perforated mt-6 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-card px-6 py-5">
        <div>
          <p className="font-display text-3xl">{TIERS[tier].name} member</p>
          <p className="font-hand text-sm leading-normal text-muted">
            {account?.renewsUntil
              ? `renews ${new Date(account.renewsUntil).toLocaleDateString("en", { month: "long", day: "numeric" })}`
              : "free forever"}
          </p>
        </div>
        <div className="border-l border-dashed border-line pl-5 text-right">
          <p className="font-display text-3xl">{account?.credits ?? 0}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">HD credits</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-muted">
            {used} of {limit.toLocaleString()} photos
            {account?.previews ? `, ${account.previews} portrait previews left` : ""}
          </p>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
          </span>
        </div>
      </div>

      {tier !== "free" && (
        <button onClick={onManage} className="mt-3 min-h-11 w-full rounded-full border border-ink/20 text-sm">
          Manage or cancel your plan
        </button>
      )}

      <h2 className="font-display mt-10 text-xl italic">Plans</h2>
      <div className="mt-3">
        <PlanCards current={tier} onBuy={onBuy} busy={busy} />
      </div>

      <h2 className="font-display mt-10 text-xl italic">Extra portraits</h2>
      <p className="mt-1 text-sm text-muted">One credit keeps a portrait in HD and adds 3 previews. They never expire.</p>
      <div className="mt-3">
        <PackList onBuy={onBuy} busy={busy} />
      </div>

      <h2 className="font-display mt-10 text-xl italic">The star</h2>
      <div className="mt-3 flex gap-2">
        <label htmlFor="rename" className="sr-only">
          Pet&apos;s name
        </label>
        <input
          id="rename"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder="Their name"
          className="min-h-13 flex-1 rounded-full border border-line bg-card px-5 outline-none focus:border-accent"
        />
        <button
          onClick={() => onProfile({ petName: name.trim() })}
          disabled={name.trim() === petName}
          className="min-h-13 rounded-full bg-ink px-6 font-medium text-paper disabled:opacity-30"
        >
          Save
        </button>
      </div>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Kind of pet">
        {(["dog", "cat", "other"] as const).map((k) => (
          <button
            key={k}
            role="radio"
            aria-checked={kind === k}
            onClick={() => onProfile({ kind: k })}
            className={`min-h-10 rounded-full px-4 text-sm capitalize ${kind === k ? "bg-ink text-paper" : "bg-sand"}`}
          >
            {k}
          </button>
        ))}
      </div>

      <label className="mt-4 flex min-h-12 items-center justify-between gap-4">
        <span>
          <span className="block">In loving memory</span>
          <span className="text-sm text-muted">For a pet who has passed: no streaks, gentler words.</span>
        </span>
        <input type="checkbox" checked={memorial} onChange={(e) => onMemorial(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
      </label>

      {link && (
        <>
          <h2 className="font-display mt-10 text-xl italic">On another phone</h2>
          <button
            onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}
            className="mt-3 flex min-h-13 w-full items-center justify-center gap-2 rounded-full border border-ink/25 font-medium"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Link copied" : "Copy my access link"}
          </button>
        </>
      )}

      <h2 className="font-display mt-10 text-xl italic">Your privacy</h2>
      <p className="mt-2 text-muted">
        Your album is private to you. Your photos are only used to show your album and to make the portraits you ask for, and we
        never use them to train AI.
      </p>
      {confirmDelete ? (
        <div className="mt-4 rounded-2xl bg-card p-4">
          <p>This removes every photo, your portraits, your plan and any unused credits. It can&apos;t be undone.</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={async () => {
                setDeleting(true);
                await onDeleteData();
                setDeleting(false);
              }}
              disabled={deleting}
              className="min-h-11 rounded-full bg-accent px-5 font-medium text-accent-ink disabled:opacity-60"
            >
              {deleting ? "Deleting" : "Delete everything"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="min-h-11 px-3 text-muted">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="mt-3 min-h-11 text-accent underline underline-offset-4">
          Delete my data
        </button>
      )}
    </section>
  );
}
