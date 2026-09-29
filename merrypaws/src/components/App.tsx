"use client";

import { Camera, FilmStrip, Ticket, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Onboarding } from "@/components/Onboarding";
import { Premiere } from "@/components/Premiere";
import { Reel } from "@/components/Reel";
import { Studio, type ShootResult } from "@/components/Studio";
import { PlanList, TicketsTab } from "@/components/Tickets";
import { Viewer } from "@/components/Viewer";
import { BRAND, type PlanId } from "@/lib/config";
import { api, storage, type Portrait, type Profile } from "@/lib/client";
import type { StyleId } from "@/lib/styles";

type Tab = "studio" | "reel" | "tickets";

const ERRORS: Record<string, string> = {
  limit_reached: "That's today's free previews. Keep one you love, or come back tomorrow for more.",
  generation_failed: "The film didn't develop. Nothing was charged, try another take.",
  bad_request: "That photo couldn't be used. Try a JPG or PNG under 4 MB.",
  not_configured: "Payments aren't switched on yet.",
  expired: "That preview has expired. Shoot a new take.",
  generic: "Something went wrong. Try again in a moment.",
};

const errorText = (code?: string) => ERRORS[code ?? "generic"] ?? ERRORS.generic;

export function App({ samples }: { samples: Record<StyleId, string | null> }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [freeLeft, setFreeLeft] = useState(0);
  const [reel, setReel] = useState<Portrait[]>([]);
  const [tab, setTab] = useState<Tab>("studio");
  const [style, setStyle] = useState<StyleId>("royal-court");
  const [openId, setOpenId] = useState<string | null>(null);
  const [premiere, setPremiere] = useState(false);
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [buying, setBuying] = useState<PlanId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const updateReel = useCallback((fn: (prev: Portrait[]) => Portrait[]) => {
    setReel((prev) => {
      const next = fn(prev);
      storage.setReel(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async (tok: string | null) => {
    const res = await api("/api/account", {}, tok).catch(() => null);
    if (!res?.ok) return null;
    const data = (await res.json()) as { invalidToken?: boolean; credits: number; freeLeft: number };
    if (data.invalidToken) {
      storage.setToken(null);
      setToken(null);
    } else setToken(tok);
    setCredits(data.credits);
    setFreeLeft(data.freeLeft);
    return data;
  }, []);

  // Restore this device's state, pick up an access link (#k=...) and finish an
  // unlock after returning from checkout.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("k")) storage.setToken(hash.get("k"));
    const query = new URLSearchParams(window.location.search);
    const paidFor = query.has("paid") ? query.get("portrait") : null;
    if (query.toString() || window.location.hash) history.replaceState(null, "", window.location.pathname);

    void (async () => {
      const saved = storage.profile();
      setProfile(saved);
      if (saved) setStyle(saved.favorite);
      setReel(storage.reel());
      setReady(true);
      const tok = storage.token();
      await refresh(tok);

      if (!query.has("paid")) return;
      setTab(paidFor ? "reel" : "tickets");
      setToast("Payment received. Your tickets are on their way.");
      if (!paidFor) return;
      setOpenId(paidFor);
      for (let i = 0; i < 15; i++) {
        const res = await api(`/api/portrait/${paidFor}`).catch(() => null);
        const data = (await res?.json().catch(() => ({}))) as { unlocked?: boolean } | undefined;
        if (data?.unlocked) {
          updateReel((prev) => prev.map((p) => (p.id === paidFor ? { ...p, unlocked: true } : p)));
          setToast("Unlocked. Save it in full quality.");
          await refresh(tok);
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      await refresh(tok);
    })();
  }, [refresh, updateReel]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  function finishOnboarding(p: Profile) {
    storage.setProfile(p);
    setProfile(p);
    setStyle(p.favorite);
    setTab("studio");
  }

  async function shoot(pet: Blob, owner: Blob | null, id: StyleId): Promise<ShootResult> {
    const form = new FormData();
    form.append("pet", pet, "pet.jpg");
    if (owner) form.append("owner", owner, "owner.jpg");
    form.append("style", id);
    try {
      const res = await api("/api/preview", { method: "POST", body: form }, token);
      const data = (await res.json().catch(() => ({}))) as { id?: string; preview?: string; mock?: boolean; error?: string };
      if (!res.ok || !data.id || !data.preview) return { ok: false, error: errorText(data.error) };
      const portrait: Portrait = {
        id: data.id,
        style: id,
        preview: data.preview,
        petName: profile?.petName ?? "",
        withOwner: Boolean(owner),
        createdAt: new Date().toISOString(),
        unlocked: false,
        starred: false,
        mock: data.mock,
      };
      updateReel((prev) => [portrait, ...prev]);
      if (!token) setFreeLeft((n) => Math.max(0, n - 1));
      return { ok: true, portrait };
    } catch {
      return { ok: false, error: errorText() };
    }
  }

  async function keep(p: Portrait) {
    if (p.unlocked) return;
    if (!token || credits < 1) {
      setSheetFor(p.id);
      return;
    }
    const res = await api("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }, token);
    const data = (await res.json().catch(() => ({}))) as { credits?: number; error?: string };
    if (!res.ok) {
      if (data.error === "no_credits") setSheetFor(p.id);
      else setToast(errorText(data.error));
      return;
    }
    updateReel((prev) => prev.map((x) => (x.id === p.id ? { ...x, unlocked: true } : x)));
    if (typeof data.credits === "number") setCredits(data.credits);
    setOpenId(p.id);
    setToast("Unlocked. Save it in full quality.");
  }

  async function buy(plan: PlanId, unlockId: string | null) {
    setBuying(plan);
    try {
      const res = await api(
        "/api/checkout",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, unlockId }) },
        token,
      );
      const data = (await res.json().catch(() => ({}))) as { url?: string; token?: string; error?: string };
      if (!res.ok || !data.url) {
        setToast(errorText(data.error));
        return;
      }
      if (data.token) storage.setToken(data.token);
      window.location.assign(data.url);
    } finally {
      setBuying(null);
    }
  }

  if (!ready) return <div className="min-h-[100dvh] bg-booth" />;
  if (!profile?.onboarded) return <Onboarding samples={samples} onDone={finishOnboarding} />;

  const tabs: { id: Tab; label: string; Icon: typeof Camera }[] = [
    { id: "studio", label: "Studio", Icon: Camera },
    { id: "reel", label: "Reel", Icon: FilmStrip },
    { id: "tickets", label: "Tickets", Icon: Ticket },
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col pt-[env(safe-area-inset-top)]">
      <header className="flex h-12 items-center justify-between px-5">
        <span className="font-marquee text-lg font-extrabold uppercase tracking-wide text-stock">{BRAND}</span>
        <button onClick={() => setTab("tickets")} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-silver">
          <Ticket size={18} /> {credits}
        </button>
      </header>

      <main className="flex-1 pb-24">
        {tab === "studio" && (
          <Studio
            petName={profile.petName}
            style={style}
            onStyle={setStyle}
            samples={samples}
            latest={reel[0] ?? null}
            shoot={shoot}
            onKeep={(p) => void keep(p)}
            onOpenReel={() => setTab("reel")}
          />
        )}
        {tab === "reel" && (
          <Reel reel={reel} onOpen={setOpenId} onPremiere={() => setPremiere(true)} onStudio={() => setTab("studio")} />
        )}
        {tab === "tickets" && (
          <TicketsTab
            credits={credits}
            freeLeft={freeLeft}
            token={token}
            petName={profile.petName}
            busy={buying}
            onBuy={(plan) => void buy(plan, null)}
            onRename={(name) => {
              const next = { ...profile, petName: name };
              storage.setProfile(next);
              setProfile(next);
              setToast("Saved. New takes will use that name.");
            }}
            onReplayIntro={() => setProfile({ ...profile, onboarded: false })}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-booth/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Sections">
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${tab === id ? "text-stock" : "text-dim"}`}
            >
              <Icon size={24} weight={tab === id ? "fill" : "regular"} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {openId && (
        <Viewer
          reel={reel}
          openId={openId}
          onClose={() => setOpenId(null)}
          onNavigate={setOpenId}
          onStar={(id) => updateReel((prev) => prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)))}
          onDelete={(id) => {
            updateReel((prev) => prev.filter((p) => p.id !== id));
            setOpenId(null);
          }}
          onKeep={(p) => void keep(p)}
        />
      )}

      {premiere && <Premiere reel={reel} petName={profile.petName} onClose={() => setPremiere(false)} />}

      {sheetFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setSheetFor(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keep this portrait"
            className="rise w-full max-w-lg rounded-t-2xl border-t border-line bg-reel px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-marquee text-3xl font-extrabold uppercase leading-none">Keep this portrait</h2>
                <p className="mt-1 text-sm text-silver">It unlocks as soon as the payment goes through.</p>
              </div>
              <button onClick={() => setSheetFor(null)} aria-label="Close" className="flex h-11 w-11 items-center justify-center">
                <X size={22} />
              </button>
            </div>
            <div className="mt-4">
              <PlanList busy={buying} onBuy={(plan) => void buy(plan, sheetFor)} />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="rise fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl border border-line bg-frame px-4 py-3 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
