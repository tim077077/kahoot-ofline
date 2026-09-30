"use client";

import { Books, FrameCorners, IdentificationCard, Ticket } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddPhotosSheet } from "@/components/AddPhotos";
import { Album, type Pending } from "@/components/Album";
import { Collage, type Highlight } from "@/components/Collage";
import { Onboarding } from "@/components/Onboarding";
import { PhotoViewer } from "@/components/PhotoViewer";
import { LooksSheet, PlansSheet, YouTab, type Busy, type Purchase, type SheetReason } from "@/components/Plans";
import { ShareSheet } from "@/components/ShareSheet";
import { Studio, type ShootRequest, type ShootResult } from "@/components/Studio";
import { Viewer, type ReportReason } from "@/components/Viewer";
import { BRAND, TIERS } from "@/lib/config";
import {
  api,
  patchPhoto,
  postPreview,
  preparePhoto,
  removePhoto,
  starName,
  storage,
  track,
  uploadPhoto,
  type Account,
  type Photo,
  type Portrait,
  type Profile,
  type UploadPhase,
} from "@/lib/client";
import { findLook, type LookId } from "@/lib/looks";
import type { StyleId } from "@/lib/styles";

type Tab = "album" | "studio" | "you";

const ERRORS: Record<string, string> = {
  limit_reached: "You've used your free portrait. Credits let you make more, and keep the ones you love in HD.",
  slow_down: "That's a lot of portraits in a minute. Give it a moment and try again.",
  generation_failed: "The print didn't come out. Nothing was charged, so try again.",
  bad_request: "That photo couldn't be used. Try a JPG or PNG under 4 MB.",
  not_configured: "That isn't switched on yet.",
  expired: "That portrait has expired. Make a new one.",
  generic: "Something went wrong. Try again in a moment.",
};

const errorText = (code?: string) => ERRORS[code ?? "generic"] ?? ERRORS.generic;

const byTaken = (a: Photo, b: Photo) => b.takenAt.localeCompare(a.takenAt);

export function App({ samples }: { samples: Record<StyleId, string | null> }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [reel, setReel] = useState<Portrait[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [batch, setBatch] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [tab, setTab] = useState<Tab>("album");
  const [style, setStyle] = useState<StyleId>("royal-court");
  const [openPortrait, setOpenPortrait] = useState<string | null>(null);
  const [openPhoto, setOpenPhoto] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [sheet, setSheet] = useState<SheetReason | null>(null);
  const [unlockFor, setUnlockFor] = useState<Portrait | null>(null);
  const [sharing, setSharing] = useState<Portrait | null>(null);
  const [looksOpen, setLooksOpen] = useState(false);
  const [picked, setPicked] = useState<File[] | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [toast, setToast] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const addInput = useRef<HTMLInputElement>(null);

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

  const applyToken = useCallback((tok: string | null) => {
    tokenRef.current = tok;
    storage.setToken(tok);
    setToken(tok);
  }, []);

  const refresh = useCallback(
    async (tok: string | null) => {
      const res = await api("/api/account", {}, tok).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as Account & { invalidToken?: boolean };
      if (data.invalidToken) applyToken(null);
      setAccount(data);
    },
    [applyToken],
  );

  const loadPhotos = useCallback(async (tok: string | null) => {
    if (!tok) return;
    const res = await api("/api/photos", {}, tok).catch(() => null);
    if (!res?.ok) return;
    setPhotos(((await res.json()) as { photos: Photo[] }).photos);
  }, []);

  // Restore this device's state, pick up an access link (#k=...) and finish a
  // purchase after returning from checkout.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("k")) storage.setToken(hash.get("k"));
    const query = new URLSearchParams(window.location.search);
    const paid = query.get("paid");
    const paidFor = paid ? query.get("portrait") : null;
    if (query.toString() || window.location.hash) history.replaceState(null, "", window.location.pathname);

    void (async () => {
      const saved = storage.profile();
      setProfile(saved);
      if (saved?.favorite) setStyle(saved.favorite);
      setReel(storage.reel());
      const tok = storage.token();
      tokenRef.current = tok;
      setToken(tok);
      setReady(true);
      await Promise.all([refresh(tok), loadPhotos(tok)]);

      if (!paid) return;
      setTab(paid === "plan" ? "album" : paidFor ? "studio" : "you");
      setToast(paid === "plan" ? "Welcome in. Your membership is active." : "Payment received. Your credits are on their way.");
      if (!paidFor) return;
      setOpenPortrait(paidFor);
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
  }, [refresh, loadPhotos, updateReel]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const tier = account?.tier ?? "free";
  const allLooks = TIERS[tier].allLooks;
  const chosenLook = findLook(profile?.look ?? "summer");
  // After a downgrade, a members-only look quietly falls back to Summer.
  const look: LookId = chosenLook.free || allLooks ? chosenLook.id : "summer";

  function openSheet(reason: SheetReason) {
    track("plans_shown");
    setSheet(reason);
  }

  async function ensureToken() {
    if (tokenRef.current) return tokenRef.current;
    const res = await api("/api/account", { method: "POST" }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { token?: string } | undefined;
    if (!data?.token) return null;
    applyToken(data.token);
    return data.token;
  }

  async function addPhotos(files: File[], tags: string[]) {
    const tok = await ensureToken();
    if (!tok) {
      setToast("Couldn't reach the album. Check your connection and try again.");
      return;
    }
    const items = files.map((file, i) => ({ file, key: `${Date.now()}-${i}`, url: URL.createObjectURL(file) }));
    setPending((p) => [...items.map((it) => ({ key: it.key, url: it.url, progress: "waiting" as const })), ...p]);
    setBatch({ total: items.length, done: 0 });
    let full = false;
    let added = 0;
    let next = 0;
    const finish = (key: string, url: string) => {
      setPending((p) => p.filter((x) => x.key !== key));
      URL.revokeObjectURL(url);
      setBatch((b) => ({ ...b, done: b.done + 1 }));
    };
    async function worker() {
      while (next < items.length) {
        const item = items[next++];
        if (full) {
          finish(item.key, item.url);
          continue;
        }
        try {
          const prepared = await preparePhoto(item.file);
          const { photo, error } = await uploadPhoto(prepared, tags, tok!);
          if (photo) {
            added++;
            setPhotos((p) => [photo, ...p].sort(byTaken));
            finish(item.key, item.url);
          } else if (error === "photo_limit") {
            full = true;
            finish(item.key, item.url);
          } else {
            setPending((p) => p.map((x) => (x.key === item.key ? { ...x, progress: "failed" } : x)));
            setBatch((b) => ({ ...b, done: b.done + 1 }));
          }
        } catch {
          setPending((p) => p.map((x) => (x.key === item.key ? { ...x, progress: "failed" } : x)));
          setBatch((b) => ({ ...b, done: b.done + 1 }));
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    if (added) track("photos_added");
    await refresh(tok);
    if (full) openSheet("photos");
    // Failed prints stay on the page for a moment, then clear.
    setTimeout(() => setPending((p) => p.filter((x) => x.progress !== "failed")), 6000);
  }

  async function changePhoto(id: string, patch: Partial<Pick<Photo, "tags" | "caption" | "favorite">>) {
    const before = photos;
    setPhotos((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const saved = token ? await patchPhoto(id, patch, token) : null;
    if (!saved) {
      setPhotos(before);
      setToast("That change didn't save. Try again in a moment.");
    }
  }

  async function deletePhoto(id: string) {
    if (!token || !(await removePhoto(id, token))) {
      setToast("Couldn't remove that photo. Try again in a moment.");
      return;
    }
    setOpenPhoto(null);
    setPhotos((p) => p.filter((x) => x.id !== id));
    void refresh(token);
  }

  async function shoot(req: ShootRequest, onPhase: (p: UploadPhase) => void): Promise<ShootResult> {
    const form = new FormData();
    form.append("pet", req.pet, "pet.jpg");
    if (req.owner) form.append("owner", req.owner, "owner.jpg");
    form.append("style", req.style);
    try {
      const { status, body } = await postPreview(form, token, onPhase);
      const data = body as { id?: string; preview?: string; mock?: boolean; error?: string };
      if (status >= 400 || !data.id || !data.preview) {
        if (data.error === "limit_reached") openSheet("previews");
        return { ok: false, error: errorText(data.error), code: data.error };
      }
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
      if (profile) saveProfile({ ...profile, favorite: req.style });
      void refresh(token);
      return { ok: true, portrait };
    } catch {
      return { ok: false, error: errorText() };
    }
  }

  async function keep(p: Portrait) {
    // Never show a paywall for something already paid for.
    if (p.unlocked) return;
    if (!token || (account?.credits ?? 0) < 1) {
      setUnlockFor(p);
      return openSheet("hd");
    }
    const res = await api("/api/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) }, token);
    const data = (await res.json().catch(() => ({}))) as { credits?: number; error?: string };
    if (!res.ok) {
      if (data.error === "no_credits") {
        setUnlockFor(p);
        openSheet("hd");
      } else setToast(errorText(data.error));
      return;
    }
    updateReel((prev) => prev.map((x) => (x.id === p.id ? { ...x, unlocked: true } : x)));
    void refresh(token);
    setOpenPortrait(p.id);
    setToast("It's yours in HD. Tap Save in HD.");
  }

  async function buy(purchase: Purchase) {
    setBusy(purchase.kind === "plan" ? `${purchase.tier}-${purchase.interval}` : purchase.pack);
    try {
      const body = purchase.kind === "pack" && unlockFor ? { ...purchase, unlockId: unlockFor.id } : purchase;
      const res = await api("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, token);
      const data = (await res.json().catch(() => ({}))) as { url?: string; token?: string; error?: string };
      if (!res.ok || !data.url) {
        setToast(data.error === "not_configured" ? "Payments aren't switched on yet." : errorText(data.error));
        return;
      }
      if (data.token) storage.setToken(data.token);
      window.location.assign(data.url);
    } finally {
      setBusy(null);
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
    tokenRef.current = null;
    setToken(null);
    setReel([]);
    setPhotos([]);
    setAccount(null);
    setProfile(null);
    setTab("album");
  }

  if (!ready) return <div className="min-h-[100dvh]" />;
  if (!profile?.onboarded) {
    return (
      <Onboarding
        onPhotos={(files) => void addPhotos(files, [])}
        uploaded={batch.done}
        total={batch.total}
        onDone={(p, next) => {
          track("onboarding_done");
          saveProfile({ petName: p.petName, kind: p.kind, favorite: "royal-court", onboarded: true, look: "summer" });
          setTab(next === "portrait" ? "studio" : "album");
        }}
      />
    );
  }

  const name = starName(profile.petName);
  const tabs: { id: Tab; label: string; Icon: typeof Books }[] = [
    { id: "album", label: "Album", Icon: Books },
    { id: "studio", label: "Portraits", Icon: FrameCorners },
    { id: "you", label: "Membership", Icon: IdentificationCard },
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col pt-[env(safe-area-inset-top)]">
      <header className="flex h-14 items-center justify-between px-5">
        <span className="font-display text-lg italic">{BRAND}</span>
        <button onClick={() => setTab("you")} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-muted" aria-label={`${account?.credits ?? 0} portrait credits`}>
          <Ticket size={20} /> {account?.credits ?? 0}
        </button>
      </header>

      <main className="flex-1 pb-24">
        {tab === "album" && (
          <Album
            petName={profile.petName}
            photos={photos}
            pending={pending}
            portraits={reel}
            look={look}
            account={account}
            onAdd={() => addInput.current?.click()}
            onLook={() => setLooksOpen(true)}
            onOpenPhoto={setOpenPhoto}
            onOpenHighlight={(h) => {
              track("highlight_opened");
              setHighlight(h);
            }}
            onOpenPortraits={() => reel[0] && setOpenPortrait(reel[0].id)}
            onPlans={() => setTab("you")}
          />
        )}
        {/* Kept mounted so the chosen photo survives a trip to another tab. */}
        <div hidden={tab !== "studio"}>
          <Studio
            petName={profile.petName}
            onPetName={(petName) => saveProfile({ ...profile, petName })}
            style={style}
            onStyle={setStyle}
            samples={samples}
            freeLeft={account?.freeLeft ?? 0}
            previews={account?.previews ?? 0}
            credits={account?.credits ?? 0}
            album={photos}
            shoot={shoot}
            onKeep={(p) => void keep(p)}
            onShare={setSharing}
            onPlans={() => openSheet("previews")}
            onOpenAlbum={() => setTab("album")}
          />
        </div>
        {tab === "you" && (
          <YouTab
            account={account}
            token={token}
            petName={profile.petName}
            kind={profile.kind ?? "dog"}
            busy={busy}
            onBuy={(p) => void buy(p)}
            onProfile={(patch) => {
              saveProfile({ ...profile, ...patch });
              if (patch.petName !== undefined) setToast("Saved.");
            }}
            onDeleteData={deleteData}
          />
        )}
      </main>

      <input
        ref={addInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        data-testid="album-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, 50);
          e.target.value = "";
          if (files.length) setPicked(files);
        }}
      />

      <nav className="paper fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Sections">
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

      {picked && (
        <AddPhotosSheet
          count={picked.length}
          name={name}
          recent={[...new Set(photos.flatMap((p) => p.tags))]}
          onClose={() => setPicked(null)}
          onAdd={(tags) => {
            const files = picked;
            setPicked(null);
            void addPhotos(files, tags);
          }}
        />
      )}

      {highlight && (
        <Collage
          highlight={highlight}
          petName={name}
          look={look}
          onClose={() => setHighlight(null)}
          onOpenPhoto={setOpenPhoto}
        />
      )}

      {openPhoto && (
        <PhotoViewer
          photos={highlight ? highlight.photos : photos}
          openId={openPhoto}
          look={look}
          petName={name}
          onClose={() => setOpenPhoto(null)}
          onNavigate={setOpenPhoto}
          onUpdate={(id, patch) => {
            void changePhoto(id, patch);
            if (highlight) setHighlight({ ...highlight, photos: highlight.photos.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
          }}
          onDelete={(id) => {
            void deletePhoto(id);
            if (highlight) setHighlight({ ...highlight, photos: highlight.photos.filter((p) => p.id !== id) });
          }}
        />
      )}

      {openPortrait && (
        <Viewer
          reel={reel}
          openId={openPortrait}
          onClose={() => setOpenPortrait(null)}
          onNavigate={setOpenPortrait}
          onStar={(id) => updateReel((prev) => prev.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)))}
          onDelete={(id) => {
            updateReel((prev) => prev.filter((p) => p.id !== id));
            setOpenPortrait(null);
          }}
          onKeep={(p) => void keep(p)}
          onShare={setSharing}
          onReport={report}
        />
      )}

      {looksOpen && (
        <LooksSheet
          look={look}
          allLooks={allLooks}
          sample={photos[0]?.thumb ?? null}
          onPick={(id) => {
            saveProfile({ ...profile, look: id });
            setLooksOpen(false);
          }}
          onLocked={() => {
            setLooksOpen(false);
            openSheet("looks");
          }}
          onClose={() => setLooksOpen(false)}
        />
      )}

      {sheet && (
        <PlansSheet
          reason={sheet}
          name={name}
          current={tier}
          busy={busy}
          onBuy={(p) => void buy(p)}
          onClose={() => {
            track("paywall_dismissed");
            setSheet(null);
            setUnlockFor(null);
          }}
        />
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
