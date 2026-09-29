"use client";

import { Check, Copy, Ticket } from "@phosphor-icons/react";
import { useState } from "react";
import { formatUsd, PLAN_ORDER, PLANS, type PlanId } from "@/lib/config";

type PlansProps = { onBuy: (plan: PlanId) => void; busy: PlanId | null };

export function PlanList({ onBuy, busy }: PlansProps) {
  return (
    <div className="grid gap-3">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        const best = id === "matinee";
        return (
          <button
            key={id}
            onClick={() => onBuy(id)}
            disabled={busy !== null}
            className={`flex min-h-16 items-center justify-between rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-60 ${best ? "border-stock bg-stock-soft" : "border-line bg-reel"}`}
          >
            <span>
              <span className="block font-semibold">{plan.name}</span>
              <span className="text-sm text-silver">{plan.blurb}</span>
            </span>
            <span className="text-right">
              <span className="block text-lg font-bold">{busy === id ? "…" : formatUsd(plan.price)}</span>
              <span className="font-script text-xs text-silver">
                {plan.credits} {plan.credits === 1 ? "ticket" : "tickets"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type TabProps = {
  credits: number;
  freeLeft: number;
  token: string | null;
  petName: string;
  onBuy: (plan: PlanId) => void;
  busy: PlanId | null;
  onRename: (name: string) => void;
  onReplayIntro: () => void;
};

export function TicketsTab({ credits, freeLeft, token, petName, onBuy, busy, onRename, onReplayIntro }: TabProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(petName);
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/#k=${token}` : "";

  return (
    <section className="px-5 pb-8 pt-2">
      <h1 className="font-marquee text-5xl font-extrabold uppercase leading-none">Tickets</h1>
      <div className="mt-6 flex items-center gap-4 rounded-xl border border-line bg-reel p-4">
        <Ticket size={36} weight="duotone" className="text-stock" />
        <div>
          <p className="text-2xl font-bold">
            {credits} {credits === 1 ? "ticket" : "tickets"}
          </p>
          <p className="text-sm text-silver">
            One ticket keeps one portrait in full quality. {freeLeft} free {freeLeft === 1 ? "preview" : "previews"} left today.
          </p>
        </div>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-silver">Get tickets</h2>
      <div className="mt-3">
        <PlanList onBuy={onBuy} busy={busy} />
      </div>

      {link && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-silver">Use your tickets on another device</h2>
          <button
            onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-line font-semibold"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Link copied" : "Copy my access link"}
          </button>
        </>
      )}

      <h2 className="mt-8 text-sm font-semibold text-silver">The star</h2>
      <div className="mt-3 flex gap-2">
        <label htmlFor="rename" className="sr-only">
          Pet&apos;s name
        </label>
        <input
          id="rename"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 24))}
          placeholder="Pet's name"
          className="min-h-12 flex-1 rounded-xl border border-line bg-reel px-4 outline-none focus:border-stock"
        />
        <button
          onClick={() => onRename(name.trim())}
          disabled={name.trim() === petName}
          className="min-h-12 rounded-full border border-line px-5 font-semibold disabled:opacity-40"
        >
          Save
        </button>
      </div>
      <button onClick={onReplayIntro} className="mt-6 min-h-11 text-sm text-silver underline underline-offset-4">
        Replay the intro
      </button>
    </section>
  );
}
