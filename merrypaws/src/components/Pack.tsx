"use client";

import { BellRinging, Copy, Heart, PawPrint, Smiley, UserPlus } from "@phosphor-icons/react";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Polaroid } from "@/components/Vintage";
import { named } from "@/i18n/app";
import { useT } from "@/i18n/react";
import type { AppPushState } from "@/lib/appPush";
import type { PackCard, Reaction } from "@/lib/client";
import type { LookId } from "@/lib/looks";

const REACTION_ICONS: Record<Reaction, typeof PawPrint> = { paw: PawPrint, heart: Heart, laugh: Smiley };

type Props = {
  cards: PackCard[] | null;
  code: string | null;
  look: LookId;
  petName: string;
  onInvite: () => void;
  onJoin: (code: string) => Promise<string | null>;
  onReact: (friend: string, reaction: Reaction) => void;
  onToggleShare: (shared: boolean) => void;
  onAddToday: () => void;
  notify: AppPushState;
  onNotify: () => void;
};

const NOTIFY_LATER_KEY = "pp_pack_notify_later";

// Today in the pack. Finite on purpose: one photo per pet per day, then
// you're done, like opening a letter rather than scrolling a feed.
export function PackTab({ cards, code, look, petName, onInvite, onJoin, onReact, onToggleShare, onAddToday, notify, onNotify }: Props) {
  const t = useT();
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [later, setLater] = useState(() => {
    try {
      return localStorage.getItem(NOTIFY_LATER_KEY) === "1";
    } catch {
      return false;
    }
  });
  const me = cards?.[0];
  const friends = cards?.slice(1) ?? [];
  const posted = friends.filter((f) => f.today).length;

  return (
    <section className="px-5 pb-12 pt-2">
      <h1 className="font-display text-[2.4rem] leading-none">{t("pack.title")}</h1>
      <p className="font-hand mt-2 text-base leading-normal text-muted">
        {friends.length === 0 ? t("pack.emptySub") : t("pack.posted", { posted, total: friends.length })}
      </p>

      {me && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-card p-4">
          {me.today ? (
            <div className="w-20 shrink-0">
              <Polaroid src={me.today.thumb} look={look} rotate={-3} />
            </div>
          ) : (
            <Mascot size={60} />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{me.today ? named(t, "pack.in", petName) : named(t, "pack.notYet", petName)}</p>
            {me.today ? (
              <label className="mt-1 flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={me.today.shared} onChange={(e) => onToggleShare(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                {t("pack.friendsSee")}
              </label>
            ) : (
              <button onClick={onAddToday} className="mt-2 min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink">
                {t("pack.addToday")}
              </button>
            )}
            {me.today && <Reactions card={me} onReact={() => {}} readOnly />}
          </div>
        </div>
      )}

      {/* Only in the apps, and only once there's someone to hear from. */}
      {friends.length > 0 && (notify === "prompt" || notify === "denied") && !later && (
        <div className="mt-4 flex gap-3 rounded-2xl bg-card p-4">
          <BellRinging size={26} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t("pack.notifyTitle")}</p>
            <p className="mt-1 text-sm text-muted">{notify === "denied" ? t("pack.notifyBlocked") : t("pack.notifyBody")}</p>
            <div className="mt-3 flex gap-2">
              {notify === "prompt" && (
                <button onClick={onNotify} className="min-h-10 rounded-full bg-accent px-4 text-sm font-medium text-accent-ink">
                  {t("pack.notifyOn")}
                </button>
              )}
              <button
                onClick={() => {
                  setLater(true);
                  try {
                    localStorage.setItem(NOTIFY_LATER_KEY, "1");
                  } catch {}
                }}
                className="min-h-10 rounded-full px-3 text-sm text-muted"
              >
                {t("pack.notifyLater")}
              </button>
            </div>
          </div>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="font-display text-2xl">{t("pack.empty")}</p>
          <p className="mx-auto mt-2 max-w-[30ch] text-muted">
            {t("pack.emptyBody")}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7">
          {friends.map((f, i) => (
            <div key={f.id} className="text-center">
              {f.today ? (
                <Polaroid src={f.today.thumb} look={look} rotate={i % 2 ? 2 : -2} caption={f.today.caption || undefined} />
              ) : (
                <div className="polaroid flex aspect-[4/5] items-center justify-center" style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}>
                  <p className="font-hand px-2 text-sm leading-normal text-muted">{t("pack.noPhoto")}</p>
                </div>
              )}
              <p className="font-script mt-2 truncate text-2xl leading-tight">{f.profile.petName || t("common.aFriendsPet")}</p>
              {f.streak > 1 && <p className="font-display text-sm italic text-muted">{t("pack.day", { n: f.streak })}</p>}
              {f.today && <Reactions card={f} onReact={(r) => onReact(f.id, r)} />}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-dashed border-ink/25 p-5">
        <p className="font-display text-xl italic">{t("pack.grow")}</p>
        <button onClick={onInvite} className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-ink">
          <UserPlus size={20} /> {t("pack.invite")}
        </button>
        {code && (
          <button
            onClick={() => void navigator.clipboard.writeText(code).then(() => setCopied(true))}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm text-muted"
          >
            <Copy size={16} /> {t("pack.yourCode")} <span className="dymo">{code}</span> {copied ? t("pack.copied") : ""}
          </button>
        )}
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!joinCode.trim()) return;
            setJoinMsg(await onJoin(joinCode.trim().toUpperCase()));
            setJoinCode("");
          }}
        >
          <label htmlFor="join-code" className="sr-only">
            {t("pack.friendsCode")}
          </label>
          <input
            id="join-code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.slice(0, 8))}
            placeholder={t("pack.friendsCode")}
            autoCapitalize="characters"
            className="min-h-11 flex-1 rounded-full border border-line bg-card px-4 uppercase tracking-[0.14em] outline-none focus:border-accent"
          />
          <button type="submit" className="min-h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper">
            {t("pack.join")}
          </button>
        </form>
        {joinMsg && <p className="mt-2 text-center text-sm text-muted">{joinMsg}</p>}
      </div>
    </section>
  );
}

function Reactions({ card, onReact, readOnly = false }: { card: PackCard; onReact: (r: Reaction) => void; readOnly?: boolean }) {
  const t = useT();
  return (
    <div className={`mt-2 flex gap-1.5 ${readOnly ? "" : "justify-center"}`}>
      {(Object.keys(REACTION_ICONS) as Reaction[]).map((r) => {
        const Icon = REACTION_ICONS[r];
        const mine = card.reactions.mine === r;
        const count = card.reactions.counts[r];
        if (readOnly && !count) return null;
        return (
          <button
            key={r}
            disabled={readOnly}
            onClick={() => onReact(r)}
            aria-pressed={mine}
            aria-label={`${t(`pack.reactions.${r}`)}${count ? `, ${count}` : ""}`}
            className={`inline-flex min-h-9 items-center gap-1 rounded-full px-2.5 text-sm transition ${mine ? "bg-accent text-accent-ink" : "bg-sand"} ${readOnly ? "min-h-7" : "active:scale-95"}`}
          >
            <Icon size={16} weight={mine ? "fill" : "regular"} /> {count > 0 && count}
          </button>
        );
      })}
    </div>
  );
}
