"use client";

import { Books, Camera, Ticket } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { Album } from "@/components/Album";
import { Intro } from "@/components/Intro";
import { ShareSheet } from "@/components/ShareSheet";
import { Sheet } from "@/components/Sheet";
import { Studio, type ShootRequest, type ShootResult } from "@/components/Studio";
import { PlanList, TicketsTab } from "@/components/Tickets";
import { Viewer, type ReportReason } from "@/components/Viewer";
import { BRAND, type PlanId } from "@/lib/config";
import { api, postPreview, starName, storage, track, type Portrait, type Profile, type UploadPhase } from "@/lib/client";
import type { StyleId } from "@/lib/styles";

type Tab = "studio" | "album" | "tickets";

const ERRORS: Record<string, string> = {
  limit_reached: "You've used your free portrait. Tickets let you make more, and keep the ones you love in HD.",
  slow_down: "That's a lot of portraits in a minute. Give it a moment and try again.",
  generation_failed: "The print didn't come out. Nothing was charged, so try again.",
  bad_request: "That photo couldn't be used. Try a JPG or PNG under 4 MB.",
  not_configured: "Payments aren't switched on yet.",
  expired: "That portrait has expired. Make a new one.",
  generic: "Something went wrong. Try again in a moment.",
};

const errorText = (code?: string) => ERRORS[code ?? "generic"] ?? ERRORS.generic;

const DEFAULT_PROFILE: Profile = { petName: "", favorite: "royal-court", onboarded: true };

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
  const [paywallFor, setPaywallFor] = useState<Portrait | null>(null);
  const [sharing, setSharing] = useState<Portrait | null>(null);
  const [buying, setBuying] = useState<PlanId | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const updateReel = useCallback((fn: (prev: Portrait[]) => Portrait[]) => {
    setReel((prev) => {
      const next = fn(prev);
      storage.setReel(next);
      return next;
    });
  }, []);

  const saveProfile = useCallback((next: Profile) => {
    storage.setProfile(next);
    setProfile(next);
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
      if (saved?.favorite) setStyle(saved.favorite);
      setReel(storage.reel());
      setReady(true);
      const tok = storage.token();
      await refresh(tok);

      if (!query.has("paid")) return;
      setTab(paidFor ? "album" : "tickets");
      setToast("Payment received. Your tickets are on their way.");
      if (!paidFor) return;
      setOpenId(paidFor);
      for (let i = 0; i < 15; i++) {
        const res = await api(`/api/portrait/${paidFor}`).catch(() => null);
        const data = (await res?.json().catch(() => ({}))) as { unlocked?: boolean } | undefined;
        if (data?.unlocked) {
          updateReel((prev) => prev.map((p) => (p.id === paidFor ? { ...p, unlocked: true } : p)));
          setToast("It's yours in HD. Tap Save in HD.");
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

  async function shoot(req: ShootRequest, onPhase: (p: UploadPhase) => void): Promise<ShootResult> {
    const form = new FormData();
    form.append("pet", req.pet, "pet.jpg");
    if (req.owner) form.append("owner", req.owner, "owner.jpg");
    form.append("style", req.style);
    try {
      const { status, body } = await postPreview(form, token, onPhase);
      const data = body as { id?: string; preview?: string; mock?: boolean; error?: string };
      if (status >= 400 || !data.id || !data.preview) return { ok: false, error: errorText(data.error), code: data.error };
      const portrait: Portrait = {
        id: data.id,
        style: req.style,
        preview: data.preview,
        petName: profile?.petName ?? "",
        withOwner: Boolean(req.owner),
        createdAt: new Date().toISOString(),
        unlocked: false,
        starred: false,
        memorial: req.memorial || undefined,
        mock: data.mock,
      };
      updateReel((prev) => [portrait, ...prev]);
      if (!token) setFreeLeft((n) => Math.max(0, n - 1));
      if (profile) saveProfile({ ...profile, favorite: req.style });
      return { ok: true, portrait };
    } catch {
      return { ok: false, error: errorText() };
    }
  }

  function openPaywall(p: Portrait) {
    track("paywall_shown");
    setPaywallFor(p);
  }

  async function keep(p: Portrait) {
    // Never show the paywall for something already paid for.
    if (p.unlocked) return;
    if (!token || credits < 1) return openPaywall(p);
    const res = await api("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }, token);
    const data = (await res.json().catch(() => ({}))) as { credits?: number; error?: string };
    if (!res.ok) {
      if (data.error === "no_credits") openPaywall(p);
      else setToast(errorText(data.error));
      return;
    }
    updateReel((prev) => prev.map((x) => (x.id === p.id ? { ...x, unlocked: true } : x)));
    if (typeof data.credits === "number") setCredits(data.credits);
    setOpenId(p.id);
    setToast("It's yours in HD. Tap Save in HD.");
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

  async function report(p: Portrait, reason: ReportReason) {
    const res = await api("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, reason }) }).catch(() => null);
    if (!res?.ok) setToast("That report didn't send. Try again in a moment.");
    return Boolean(res?.ok);
  }

  async function deleteData() {
    const res = await api(
      "/api/account",
      { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portraits: reel.map((p) => p.id) }) },
      token,
    ).catch(() => null);
    if (!res?.ok) {
      setToast("Couldn't reach the server, so nothing was deleted. Try again in a moment.");
      return;
    }
    storage.clear();
    setReel([]);
    setToken(null);
    setCredits(0);
    setProfile(null);
    setTab("studio");
  }

  if (!ready) return <div className="min-h-[100dvh] bg-paper" />;
  if (!profile?.onboarded) {
    return <Intro samples={samples} onStart={() => saveProfile({ ...DEFAULT_PROFILE, ...profile, onboarded: true })} />;
  }

  const tabs: { id: Tab; label: string; Icon: typeof Camera }[] = [
    { id: "studio", label: "Studio", Icon: Camera },
    { id: "album", label: "Album", Icon: Books },
    { id: "tickets", label: "Tickets", Icon: Ticket },
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col pt-[env(safe-area-inset-top)]">
      <header className="flex h-14 items-center justify-between px-5">
        <span className="font-display text-lg italic">{BRAND}</span>
        <button onClick={() => setTab("tickets")} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-muted" aria-label={`${credits} tickets`}>
          <Ticket size={20} /> {credits}
        </button>
      </header>

      <main className="flex-1 pb-24">
        {/* Kept mounted so the chosen photo survives a trip to the album. */}
        <div hidden={tab !== "studio"}>
          <Studio
            petName={profile.petName}
            onPetName={(petName) => saveProfile({ ...profile, petName })}
            style={style}
            onStyle={setStyle}
            samples={samples}
            freeLeft={freeLeft}
            credits={credits}
            shoot={shoot}
            onKeep={(p) => void keep(p)}
            onShare={setSharing}
            onTickets={() => setTab("tickets")}
            onOpenAlbum={() => setTab("album")}
          />
        </div>
        {tab === "album" && <Album reel={reel} onOpen={setOpenId} onStudio={() => setTab("studio")} />}
        {tab === "tickets" && (
          <TicketsTab
            credits={credits}
            freeLeft={freeLeft}
            token={token}
            petName={profile.petName}
            busy={buying}
            onBuy={(plan) => void buy(plan, null)}
            onRename={(petName) => {
              saveProfile({ ...profile, petName });
              setToast("Saved. New portraits will use that name.");
            }}
            onDeleteData={deleteData}
          />
        )}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Sections">
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`flex min-h-15 flex-col items-center justify-center gap-0.5 text-xs ${tab === id ? "font-medium text-accent" : "text-muted"}`}
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
          onShare={setSharing}
          onReport={report}
        />
      )}

      {paywallFor && (
        <Sheet label="Keep this portrait" onClose={() => setPaywallFor(null)}>
          <h2 className="font-display text-[1.8rem] leading-tight">
            {paywallFor.memorial ? `Keep ${starName(paywallFor.petName)}'s portrait` : `Keep ${starName(paywallFor.petName)} in HD`}
          </h2>
          <p className="mt-1 text-muted">Full resolution, no watermark, ready to print or frame.</p>
          <div className="mt-5">
            <PlanList busy={buying} onBuy={(plan) => void buy(plan, paywallFor.id)} />
          </div>
          <button
            onClick={() => {
              track("paywall_dismissed");
              setPaywallFor(null);
            }}
            className="mt-3 min-h-12 w-full text-muted underline underline-offset-4"
          >
            Not now
          </button>
        </Sheet>
      )}

      {sharing && <ShareSheet portrait={sharing} onClose={() => setSharing(null)} />}

      {toast && (
        <div role="status" className="rise fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-2xl bg-ink px-5 py-3.5 text-paper shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
