"use client";

import { Check, FilmStrip, Lock } from "@phosphor-icons/react";
import { createContext, useContext, useState } from "react";
import { SafetySection } from "@/components/Safety";
import { Sheet } from "@/components/Sheet";
import { shareOrigin, type Account, type PetKind } from "@/lib/client";
import { lookLabel, money, named, tierBlurb, tierName } from "@/i18n/app";
import { isLocale, LOCALE_NAMES, LOCALES } from "@/i18n/core";
import { useT, type T } from "@/i18n/react";
import { listPrice, PACK_ORDER, PACKS, PAID_TIERS, PREVIEWS_PER_CREDIT, productId, TARGET_TIER, TIERS, type Interval, type Price, type Purchase, type Tier } from "@/lib/config";
import { findLook, LOOKS, type LookId } from "@/lib/looks";

export type { Purchase };

// The buyer's prices, in their currency, keyed by product id (see payments.ts).
export const PricesContext = createContext<Record<string, Price>>({});

function usePrice() {
  const prices = useContext(PricesContext);
  return (p: Purchase): Price => prices[productId(p)] ?? listPrice(p);
}
export type Busy = string | null;
const busyKey = (p: Purchase) => (p.kind === "plan" ? `${p.tier}-${p.interval}` : p.pack);

function perks(t: T, tier: Tier) {
  const info = TIERS[tier];
  const list: string[] = [];
  if (tier === TARGET_TIER) list.push(t("plans.perks.daily", { n: info.hdPerMonth }));
  else if (info.hdPerMonth) list.push(t.tp("plans.perks.hd", info.hdPerMonth));
  list.push(t("plans.perks.photos", { n: t.number(info.photos) }));
  list.push(info.allLooks ? t("plans.perks.allLooks") : t("plans.perks.twoLooks"));
  list.push(t.tp("plans.perks.freezes", info.freezesPerMonth));
  list.push(info.previewsPerMonth ? t.tp("plans.perks.tries", info.previewsPerMonth) : t("plans.perks.firstFree"));
  return list;
}


// Three plans, the priciest first as the anchor and Plus in the middle,
// highlighted and ready to pick. Every price is the full price: no fake
// discounts, no countdowns (see PSYCHOLOGY.md).
export function PlanCards({ current, onBuy, onRestore, busy }: { current: Tier; onBuy: (p: Purchase) => void; onRestore?: () => void; busy: Busy }) {
  const t = useT();
  const priceOf = usePrice();
  const [interval, setInterval] = useState<Interval>("year");
  const target = (i: Interval) => priceOf({ kind: "plan", tier: TARGET_TIER, interval: i }).micros;
  const savings = Math.round((1 - target("year") / (target("month") * 12)) * 100);
  return (
    <div>
      <div className="mx-auto flex w-fit rounded-full bg-sand p-1" role="radiogroup" aria-label={t("plans.billing")}>
        {(["month", "year"] as const).map((i) => (
          <button
            key={i}
            role="radio"
            aria-checked={interval === i}
            onClick={() => setInterval(i)}
            className={`min-h-10 rounded-full px-5 text-sm transition ${interval === i ? "bg-card font-medium shadow-sm" : "text-muted"}`}
          >
            {i === "month" ? t("plans.monthly") : t("plans.yearly", { percent: savings })}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3">
        {PAID_TIERS.map((tier) => {
          const price = priceOf({ kind: "plan", tier, interval });
          const isCurrent = current === tier;
          const featured = tier === TARGET_TIER;
          return (
            <div key={tier} className={`relative rounded-2xl bg-card p-5 ${featured ? "ring-2 ring-accent shadow-[0_18px_36px_-24px_var(--shadow)]" : "opacity-95"}`}>
              {featured && (
                <span className="dymo absolute -top-3 left-5" data-tone="red">
                  {t("plans.mostLoved")}
                </span>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-2xl">{tierName(t, tier)}</h3>
                  <p className="font-hand text-sm leading-normal text-muted">{tierBlurb(t, tier)}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-xl font-medium">
                    {money(t.locale, price)}
                    <span className="text-sm font-normal text-muted">{interval === "month" ? t("plans.perMonth") : t("plans.perYear")}</span>
                  </span>
                  <span className="whitespace-nowrap text-sm text-muted">
                    {featured
                      ? t("plans.perDay", { price: money(t.locale, price, interval === "year" ? 365 : 30) })
                      : interval === "year"
                        ? t("plans.aMonth", { price: money(t.locale, price, 12) })
                        : ""}
                  </span>
                </p>
              </div>
              <ul className="mt-4 space-y-2">
                {perks(t, tier).map((perk, k) => (
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
                {isCurrent ? t("plans.yourPlan") : busy === busyKey({ kind: "plan", tier, interval }) ? t("common.opening") : t("plans.choose", { plan: tierName(t, tier) })}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-muted">{t("plans.cancelNote")}</p>
      {onRestore && (
        <button onClick={onRestore} disabled={busy !== null} className="mt-1 min-h-11 w-full text-sm text-muted underline underline-offset-4 disabled:opacity-60">
          {busy === "restore" ? t("plans.restoring") : t("plans.restore")}
        </button>
      )}
    </div>
  );
}

export function PackList({ onBuy, busy }: { onBuy: (p: Purchase) => void; busy: Busy }) {
  const t = useT();
  const priceOf = usePrice();
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
            <span className="mt-1 text-xs uppercase tracking-[0.14em]">{t("plans.portraits")}</span>
            <span className="mt-2 font-medium">{busy === id ? t("common.opening") : money(t.locale, priceOf({ kind: "pack", pack: id }))}</span>
          </button>
        );
      })}
    </div>
  );
}

export type SheetReason = "photos" | "hd" | "previews" | "looks";

function sheetCopy(t: T, reason: SheetReason, petName: string): { title: string; body: string; packs: boolean } {
  switch (reason) {
    case "photos":
      return { title: named(t, "plans.sheets.photosTitle", petName), body: t("plans.sheets.photosBody", { n: TIERS.free.photos }), packs: false };
    case "hd":
      return { title: named(t, "plans.sheets.hdTitle", petName), body: t("plans.sheets.hdBody"), packs: true };
    case "previews":
      return { title: t("plans.sheets.previewsTitle"), body: t("plans.sheets.previewsBody"), packs: true };
    case "looks":
      return { title: t("plans.sheets.looksTitle"), body: t("plans.sheets.looksBody"), packs: false };
  }
}

export function PlansSheet({ reason, petName, current, onBuy, onRestore, busy, onClose }: {
  reason: SheetReason;
  petName: string;
  current: Tier;
  onBuy: (p: Purchase) => void;
  onRestore?: () => void;
  busy: Busy;
  onClose: (dismissed: boolean) => void;
}) {
  const t = useT();
  const copy = sheetCopy(t, reason, petName);
  return (
    <Sheet label={copy.title} onClose={() => onClose(true)}>
      <div className="max-h-[78dvh] overflow-y-auto pb-2">
        <h2 className="font-display text-[1.8rem] leading-tight">{copy.title}</h2>
        <p className="mt-1 text-muted">{copy.body}</p>
        {copy.packs && (
          <div className="mt-5">
            <PackList onBuy={onBuy} busy={busy} />
            <p className="font-display mt-6 text-center italic text-muted">{t("plans.orMonthly")}</p>
          </div>
        )}
        <div className="mt-4">
          <PlanCards current={current} onBuy={onBuy} onRestore={onRestore} busy={busy} />
        </div>
        <button onClick={() => onClose(true)} className="mt-2 min-h-12 w-full text-muted underline underline-offset-4">
          {t("plans.notNow")}
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
  const t = useT();
  return (
    <Sheet label={t("looks.title")} onClose={onClose}>
      <h2 className="font-display text-[1.8rem] leading-tight">{t("looks.title")}</h2>
      <p className="mt-1 text-muted">{t("looks.body")}</p>
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
              <span className="mt-1.5 block text-sm">{lookLabel(t, l.id)}</span>
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
  onRestore?: () => void;
  memorial: boolean;
  onMemorial: (on: boolean) => void;
  reminderHour: number | null;
  onReminderHour: (hour: number | null) => void;
  onBackup: () => void;
  onSignIn: () => void;
};

export function YouTab({ account, token, petName, kind, onBuy, busy, onProfile, onDeleteData, onManage, onRestore, memorial, onMemorial, reminderHour, onReminderHour, onBackup, onSignIn }: YouProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(petName);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const tier = account?.tier ?? "free";
  const link = token && typeof window !== "undefined" ? `${shareOrigin()}/#k=${token}` : "";
  const used = account?.photos ?? 0;
  const limit = account?.photoLimit ?? TIERS.free.photos;

  return (
    <section className="px-5 pb-12 pt-2">
      <h1 className="font-display text-[2.4rem] leading-none">{t("you.title")}</h1>

      <div className="perforated mt-6 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-card px-6 py-5">
        <div>
          <p className="font-display text-3xl">{t("you.member", { plan: tierName(t, tier) })}</p>
          <p className="font-hand text-sm leading-normal text-muted">
            {account?.renewsUntil
              ? t("you.renews", { date: t.date(account.renewsUntil, { month: "long", day: "numeric" }) })
              : t("you.freeForever")}
          </p>
        </div>
        <div className="border-l border-dashed border-line pl-5 text-right">
          <p className="font-display text-3xl">{account?.credits ?? 0}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{t("you.hdCredits")}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-muted">
            {t("you.usage", { used: t.number(used), limit: t.number(limit) })}
            {account?.previews ? t.tp("you.previewsLeft", account.previews) : ""}
          </p>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-sand">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
          </span>
        </div>
      </div>

      {tier !== "free" && (
        <button onClick={onManage} className="mt-3 min-h-11 w-full rounded-full border border-ink/20 text-sm">
          {t("you.manage")}
        </button>
      )}

      <h2 className="font-display mt-10 text-xl italic">{t("you.plans")}</h2>
      <div className="mt-3">
        <PlanCards current={tier} onBuy={onBuy} onRestore={onRestore} busy={busy} />
      </div>

      <h2 className="font-display mt-10 text-xl italic">{t("you.extra")}</h2>
      <p className="mt-1 text-sm text-muted">{t("you.extraBody", { n: PREVIEWS_PER_CREDIT })}</p>
      <div className="mt-3">
        <PackList onBuy={onBuy} busy={busy} />
      </div>

      <h2 className="font-display mt-10 text-xl italic">{t("you.theStar")}</h2>
      <div className="mt-3 flex gap-2">
        <label htmlFor="rename" className="sr-only">
          {t("you.petsName")}
        </label>
        <input
          id="rename"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder={t("you.theirName")}
          className="min-h-13 flex-1 rounded-full border border-line bg-card px-5 outline-none focus:border-accent"
        />
        <button
          onClick={() => onProfile({ petName: name.trim() })}
          disabled={name.trim() === petName}
          className="min-h-13 rounded-full bg-ink px-6 font-medium text-paper disabled:opacity-30"
        >
          {t("common.save")}
        </button>
      </div>
      <div className="mt-3 flex gap-2" role="radiogroup" aria-label={t("onboarding.kindOfPet")}>
        {(["dog", "cat", "other"] as const).map((k) => (
          <button
            key={k}
            role="radio"
            aria-checked={kind === k}
            onClick={() => onProfile({ kind: k })}
            className={`min-h-10 rounded-full px-4 text-sm ${kind === k ? "bg-ink text-paper" : "bg-sand"}`}
          >
            {t(`common.kinds.${k}`)}
          </button>
        ))}
      </div>

      <label className="mt-4 flex min-h-12 items-center justify-between gap-4">
        <span>
          <span className="block">{t("common.inLovingMemory")}</span>
          <span className="text-sm text-muted">{t("you.memorialHint")}</span>
        </span>
        <input type="checkbox" checked={memorial} onChange={(e) => onMemorial(e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
      </label>

      <SafetySection
        email={account?.email ?? null}
        token={token}
        hour={reminderHour}
        memorial={memorial}
        copied={copied}
        onBackup={onBackup}
        onSignIn={onSignIn}
        onCopyLink={() => link && void navigator.clipboard.writeText(link).then(() => setCopied(true))}
        onHour={onReminderHour}
      />

      <h2 className="font-display mt-10 text-xl italic">{t("common.language")}</h2>
      <label className="mt-3 flex min-h-12 items-center justify-between gap-4">
        <span className="text-sm text-muted">{t("you.languageHint")}</span>
        <select
          value={t.locale}
          onChange={(e) => isLocale(e.target.value) && t.setLocale(e.target.value)}
          aria-label={t("common.language")}
          className="min-h-11 rounded-full border border-line bg-card px-4 outline-none focus:border-accent"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l} lang={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </label>

      <h2 className="font-display mt-10 text-xl italic">{t("you.privacy")}</h2>
      <p className="mt-2 text-muted">{t("you.privacyBody")}</p>
      {confirmDelete ? (
        <div className="mt-4 rounded-2xl bg-card p-4">
          <p>{t("you.deleteWarning")}</p>
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
              {deleting ? t("you.deleting") : t("you.deleteAll")}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="min-h-11 px-3 text-muted">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="mt-3 min-h-11 text-accent underline underline-offset-4">
          {t("you.deleteMine")}
        </button>
      )}
    </section>
  );
}
