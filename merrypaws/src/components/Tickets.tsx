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
            className={`flex min-h-18 items-center justify-between rounded-2xl px-5 py-3 text-left transition active:scale-[0.99] disabled:opacity-60 ${best ? "bg-card ring-2 ring-accent" : "bg-card"}`}
          >
            <span>
              <span className="font-display block text-lg">{plan.name}</span>
              <span className="text-sm text-muted">{plan.blurb}</span>
            </span>
            <span className="text-right">
              <span className="block text-lg font-medium">{busy === id ? "Opening" : formatUsd(plan.price)}</span>
              <span className="text-sm text-muted">
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
  onDeleteData: () => Promise<void>;
};

export function TicketsTab({ credits, freeLeft, token, petName, onBuy, busy, onRename, onDeleteData }: TabProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(petName);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/#k=${token}` : "";

  return (
    <section className="px-5 pb-10 pt-2">
      <h1 className="font-display text-[2.4rem] leading-none">Tickets</h1>

      <div className="mt-6 flex items-center gap-4 rounded-2xl bg-card p-5">
        <Ticket size={40} weight="duotone" className="shrink-0 text-accent" />
        <div>
          <p className="font-display text-2xl">
            {credits} {credits === 1 ? "ticket" : "tickets"}
          </p>
          <p className="text-muted">
            One ticket keeps one portrait in HD.
            {credits === 0 && freeLeft > 0 ? " Your first portrait is free." : ""}
          </p>
        </div>
      </div>

      <h2 className="font-display mt-10 text-xl italic">Get tickets</h2>
      <div className="mt-3">
        <PlanList onBuy={onBuy} busy={busy} />
      </div>
      <p className="mt-3 text-sm text-muted">One-time purchases. No subscription.</p>

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
          onClick={() => onRename(name.trim())}
          disabled={name.trim() === petName}
          className="min-h-13 rounded-full bg-ink px-6 font-medium text-paper disabled:opacity-30"
        >
          Save
        </button>
      </div>

      <h2 className="font-display mt-10 text-xl italic">Your privacy</h2>
      <p className="mt-2 text-muted">
        Your photos are only used to make your portraits. Your album lives on this phone, and each portrait can be kept in HD
        for 30 days after it&apos;s made.
      </p>
      {confirmDelete ? (
        <div className="mt-4 rounded-2xl bg-card p-4">
          <p>This removes your portraits, your album and any unused tickets. It can&apos;t be undone.</p>
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
