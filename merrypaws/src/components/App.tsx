"use client";

import { Books, FrameCorners, IdentificationCard, Ticket, UsersThree } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddPhotosSheet } from "@/components/AddPhotos";
import { Album, type Pending } from "@/components/Album";
import { Collage, type Highlight } from "@/components/Collage";
import { DailyCard, findMemory, MemoryCard, MilestoneSheet } from "@/components/Daily";
import { Onboarding } from "@/components/Onboarding";
import { PackTab } from "@/components/Pack";
import { PhotoViewer } from "@/components/PhotoViewer";
import { BackupNudge, BackupSheet, ReminderCard, type BackupMode } from "@/components/Safety";
import { LooksSheet, PlansSheet, YouTab, type Busy, type Purchase, type SheetReason } from "@/components/Plans";
import { ShareSheet } from "@/components/ShareSheet";
import { Studio, type ShootRequest, type ShootResult } from "@/components/Studio";
import { Viewer, type ReportReason } from "@/components/Viewer";
import { BRAND, TIERS } from "@/lib/config";
import {
  api,
  jsonApi,
  localDay,
  patchPhoto,
  postPreview,
  preparePhoto,
  removePhoto,
  starName,
  storage,
  track,
  uploadPhoto,
  type Account,
  type Daily,
  type DailyResult,
  type PackCard,
  type Photo,
  type Portrait,
  type Profile,
  type Reaction,
  type UploadPhase,
} from "@/lib/client";
import { makeCollageCard, makePhotoStoryCard, shareToInstagramStory } from "@/lib/share";
import { findLook, type LookId } from "@/lib/looks";
import { disableReminder, registerWorker, syncReminder } from "@/lib/reminders";
import type { StyleId } from "@/lib/styles";

type Tab = "album" | "pack" | "studio" | "you";

const INVITE_KEY = "pp_invite";
const BACKUP_LATER_KEY = "pp_backup_later";
const REMINDER_LATER_KEY = "pp_reminder_later";
const DAY_MS = 24 * 60 * 60 * 1000;

// "Later" on a nudge hides it for a while, not forever.
function snoozed(key: string, days: number) {
  try {
    return Date.now() - Number(localStorage.getItem(key) ?? 0) < days * DAY_MS;
  } catch {
    return true;
  }
}

function snooze(key: string) {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // Blocked storage: the nudge comes back next visit.
  }
}

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
  const [daily, setDaily] = useState<Daily | null>(null);
  const [pack, setPack] = useState<{ code: string; cards: PackCard[] } | null>(null);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [dailyBusy, setDailyBusy] = useState(false);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [backup, setBackup] = useState<BackupMode | null>(null);
  const [reminderHour, setReminderHour] = useState<number | null>(null);
  // Bumped when a nudge is snoozed, so the album re-renders without it.
  const [, setNudges] = useState(0);
  const tokenRef = useRef<string | null>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const dailyInput = useRef<HTMLInputElement>(null);

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
      if (!res?.ok) return null;
      const data = (await res.json()) as Account & { invalidToken?: boolean };
      if (data.invalidToken) applyToken(null);
      setAccount(data);
      return data;
    },
    [applyToken],
  );

  const loadPhotos = useCallback(async (tok: string | null) => {
    if (!tok) return;
    const res = await api("/api/photos", {}, tok).catch(() => null);
    if (!res?.ok) return;
    setPhotos(((await res.json()) as { photos: Photo[] }).photos);
  }, []);

  const loadDaily = useCallback(async (tok: string | null) => {
    if (!tok) return;
    const res = await api(`/api/daily?day=${localDay()}`, {}, tok).catch(() => null);
    if (res?.ok) setDaily((await res.json()) as Daily);
  }, []);

  const loadPack = useCallback(async (tok: string | null) => {
    if (!tok) return;
    const res = await api(`/api/pack?day=${localDay()}`, {}, tok).catch(() => null);
    if (res?.ok) setPack((await res.json()) as { code: string; cards: PackCard[] });
  }, []);

  const syncProfile = useCallback((tok: string | null, p: Profile | null) => {
    if (tok && p) void jsonApi("/api/profile", "PUT", { petName: p.petName, kind: p.kind ?? "dog", memorial: Boolean(p.memorial) }, tok).catch(() => {});
  }, []);

  // A pending invite (from a ?pack= link) is used as soon as there's an account.
  const joinInvite = useCallback(
    async (tok: string | null) => {
      let code: string | null = null;
      try {
        code = localStorage.getItem(INVITE_KEY);
      } catch {
        code = null;
      }
      if (!tok || !code) return;
      const res = await jsonApi("/api/pack/join", "POST", { code }, tok).catch(() => null);
      try {
        localStorage.removeItem(INVITE_KEY);
      } catch {
        // Storage blocked: the invite simply isn't retried.
      }
      const data = (await res?.json().catch(() => ({}))) as { result?: string } | undefined;
      if (data?.result === "joined") setToast("You joined a friend's pack. Say hi with a paw.");
      await loadPack(tok);
    },
    [loadPack],
  );

  // Restore this device's state, pick up an access link (#k=...) or a pack
  // invite (?pack=...), and finish a purchase after returning from checkout.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get("k")) storage.setToken(hash.get("k"));
    const query = new URLSearchParams(window.location.search);
    const paid = query.get("paid");
    const paidFor = paid ? query.get("portrait") : null;
    const invite = query.get("pack");
    if (invite) {
      try {
        localStorage.setItem(INVITE_KEY, invite.toUpperCase());
      } catch {
        // Private mode: the friend can still enter the code by hand.
      }
    }
    if (query.toString() || window.location.hash) history.replaceState(null, "", window.location.pathname);

    void (async () => {
      if (invite) setInvitedBy(invite);
      const saved = storage.profile();
      setProfile(saved);
      if (saved?.favorite) setStyle(saved.favorite);
      setReel(storage.reel());
      const tok = storage.token();
      tokenRef.current = tok;
      setToken(tok);
      setReady(true);
      registerWorker();
      const [acct] = await Promise.all([refresh(tok), loadPhotos(tok), loadDaily(tok), loadPack(tok)]);
      if (tok) void syncReminder(tok).then(setReminderHour);
      await joinInvite(tok);

      if (!paid) return;
      setTab(paid === "plan" ? "album" : paidFor ? "studio" : "you");
      setToast(paid === "plan" ? "Welcome in. Your membership is active." : "Payment received. Your credits are on their way.");
      // Something paid for should never live only on one phone.
      if (acct?.account && !acct.email) setBackup("backup");
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
  }, [refresh, loadPhotos, loadDaily, loadPack, joinInvite, updateReel]);

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
    void joinInvite(data.token);
    return data.token;
  }

  // A new phone signed in to an existing album: bring back the pet's details
  // and everything else from the server.
  async function signedIn(tok: string) {
    applyToken(tok);
    const res = await api("/api/profile", {}, tok).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { profile?: { petName: string; kind: Profile["kind"]; memorial: boolean } } | undefined;
    const current = storage.profile();
    const restored: Profile = {
      petName: data?.profile?.petName ?? current?.petName ?? "",
      kind: data?.profile?.kind ?? current?.kind ?? "dog",
      memorial: data?.profile?.memorial ?? false,
      favorite: current?.favorite ?? "royal-court",
      look: current?.look ?? "summer",
      onboarded: true,
    };
    saveProfile(restored);
    setBackup(null);
    setTab("album");
    await Promise.all([refresh(tok), loadPhotos(tok), loadDaily(tok), loadPack(tok)]);
    setReminderHour(await syncReminder(tok));
    track("signed_in");
    setToast(`Welcome back. ${starName(restored.petName)}'s album is here.`);
  }

  function onDaily(result: DailyResult | undefined) {
    if (!result?.newDay) return;
    track("daily_done");
    if (result.milestone && !profile?.memorial) {
      track("streak_milestone");
      setMilestone(result.milestone);
    }
  }

  async function storyForPhoto(photo: Photo) {
    try {
      const isToday = daily?.todayEntry?.photoId === photo.id;
      const blob = await makePhotoStoryCard(photo.full, {
        name,
        caption: photo.caption,
        date: photo.takenAt,
        filter: findLook(look).filter,
        roll: isToday && !profile?.memorial ? daily?.count : undefined,
      });
      if ((await shareToInstagramStory(blob, name)) !== "cancelled") track("story_share");
    } catch {
      setToast("Couldn't make the story. Try again in a moment.");
    }
  }

  async function storyForRoll(count: number) {
    const roll = photos.filter((p) => daily?.dailyPhotoIds.includes(p.id)).slice(0, 5);
    if (!roll.length) return;
    try {
      const blob = await makeCollageCard(roll.map((p) => ({ src: p.full, date: p.takenAt })), { title: `${count} days`, name, filter: findLook(look).filter });
      if ((await shareToInstagramStory(blob, `${count} days of ${name}`)) !== "cancelled") track("story_share");
    } catch {
      setToast("Couldn't make the story. Try again in a moment.");
    }
  }

  async function invite() {
    const tok = await ensureToken();
    if (!tok) return;
    let code = pack?.code;
    if (!code) {
      const res = await api(`/api/pack?day=${localDay()}`, {}, tok).catch(() => null);
      code = res?.ok ? ((await res.json()) as { code: string }).code : undefined;
    }
    if (!code) return;
    const url = `${window.location.origin}/?pack=${code}`;
    const text = `Join ${name === "Your pet" ? "my pet" : name}'s pack on ${BRAND}: one photo of our pets a day.`;
    track("pack_invite_sent");
    try {
      if (navigator.share) {
        await navigator.share({ title: BRAND, text, url });
        return;
      }
    } catch {
      return;
    }
    await navigator.clipboard?.writeText(`${text} ${url}`).catch(() => {});
    setToast("Invite link copied. Send it to a friend.");
  }

  async function reactTo(friend: string, reaction: Reaction) {
    if (!token || !pack) return;
    track("reaction");
    setPack({
      ...pack,
      cards: pack.cards.map((c) => {
        if (c.id !== friend) return c;
        const counts = { ...c.reactions.counts };
        if (c.reactions.mine) counts[c.reactions.mine]--;
        const mine = c.reactions.mine === reaction ? null : reaction;
        if (mine) counts[mine]++;
        return { ...c, reactions: { counts, mine } };
      }),
    });
    await jsonApi("/api/pack/react", "POST", { friend, day: localDay(), reaction }, token).catch(() => null);
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
          const { photo, error, daily: dayResult } = await uploadPhoto(prepared, tags, tok!);
          if (photo) {
            added++;
            onDaily(dayResult);
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
    await Promise.all([refresh(tok), loadDaily(tok), loadPack(tok)]);
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
    form.append("day", localDay());
    try {
      const { status, body } = await postPreview(form, token, onPhase);
      const data = body as { id?: string; preview?: string; mock?: boolean; error?: string; daily?: DailyResult };
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
      onDaily(data.daily);
      void refresh(token);
      void loadDaily(token);
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
    if (token) await disableReminder(token);
    setReminderHour(null);
    storage.clear();
    tokenRef.current = null;
    setToken(null);
    setReel([]);
    setPhotos([]);
    setAccount(null);
    setProfile(null);
    setDaily(null);
    setPack(null);
    setTab("album");
  }

  async function manage() {
    const res = token ? await jsonApi("/api/billing", "POST", {}, token).catch(() => null) : null;
    const data = (await res?.json().catch(() => ({}))) as { url?: string } | undefined;
    if (data?.url) window.location.assign(data.url);
    else setToast("Manage it in your App Store or Google Play subscriptions, or reply to your receipt email.");
  }

  const backupSheet = backup && (
    <BackupSheet
      mode={backup}
      token={token}
      name={starName(profile?.petName ?? "")}
      warning={
        backup === "signin" && account?.photos && !account.email
          ? `This phone's album (${account.photos} ${account.photos === 1 ? "photo" : "photos"}) isn't backed up. Signing in to another album leaves it behind.`
          : null
      }
      onClose={() => setBackup(null)}
      onBackedUp={(email) => {
        setBackup(null);
        setAccount((a) => (a ? { ...a, email } : a));
        track("backup_done");
        setToast("Done. The album can be opened on any phone with that email.");
      }}
      onSignedIn={signedIn}
    />
  );

  if (!ready) return <div className="min-h-[100dvh]" />;
  if (!profile?.onboarded) {
    return (
      <>
      <Onboarding
        onSignIn={() => setBackup("signin")}
        invitedBy={invitedBy}
        onPhotos={(files) => void addPhotos(files, [])}
        uploaded={batch.done}
        total={batch.total}
        onDone={(p, next) => {
          track("onboarding_done");
          const saved: Profile = { petName: p.petName, kind: p.kind, memorial: p.memorial, favorite: "royal-court", onboarded: true, look: "summer" };
          saveProfile(saved);
          syncProfile(tokenRef.current, saved);
          setTab(next === "portrait" ? "studio" : "album");
        }}
      />
      {backupSheet}
      </>
    );
  }

  const name = starName(profile.petName);
  const today = localDay();
  const memory = findMemory(photos, today);
  const todayPhoto = photos.find((p) => p.id === daily?.todayEntry?.photoId) ?? null;
  const tabs: { id: Tab; label: string; Icon: typeof Books }[] = [
    { id: "album", label: "Album", Icon: Books },
    { id: "pack", label: "Pack", Icon: UsersThree },
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
            dailyPhotoIds={daily?.dailyPhotoIds}
            top={
              <>
                {!profile.memorial && photos.length > 0 && (
                  <DailyCard
                    name={name}
                    daily={daily}
                    today={today}
                    todayPhoto={todayPhoto}
                    look={look}
                    busy={dailyBusy}
                    onAdd={() => dailyInput.current?.click()}
                    onStory={() => todayPhoto && void storyForPhoto(todayPhoto)}
                    onPack={() => setTab("pack")}
                    onMakeRoom={() => openSheet("photos")}
                  />
                )}
                {!profile.memorial && token && daily?.doneToday && reminderHour === null && !snoozed(REMINDER_LATER_KEY, 14) && (
                  <ReminderCard
                    token={token}
                    onOn={(h) => {
                      track("reminder_on");
                      setReminderHour(h);
                      setToast("See you tomorrow. One reminder, only if today's photo isn't in.");
                    }}
                    onDismiss={() => {
                      snooze(REMINDER_LATER_KEY);
                      setNudges((n) => n + 1);
                    }}
                  />
                )}
                {account?.account && !account.email && photos.length >= 5 && !snoozed(BACKUP_LATER_KEY, 7) && (
                  <BackupNudge
                    name={name}
                    onAdd={() => setBackup("backup")}
                    onLater={() => {
                      snooze(BACKUP_LATER_KEY);
                      setNudges((n) => n + 1);
                    }}
                  />
                )}
                {memory && (
                  <MemoryCard
                    memory={memory}
                    look={look}
                    onOpen={() => {
                      track("memory_opened");
                      setOpenPhoto(memory.photo.id);
                    }}
                  />
                )}
              </>
            }
          />
        )}
        {tab === "pack" && (
          <PackTab
            cards={pack?.cards ?? null}
            code={pack?.code ?? null}
            look={look}
            name={name}
            onInvite={() => void invite()}
            onJoin={async (code) => {
              const tok = await ensureToken();
              if (!tok) return "Couldn't reach the server.";
              const res = await jsonApi("/api/pack/join", "POST", { code }, tok).catch(() => null);
              const data = (await res?.json().catch(() => ({}))) as { result?: string } | undefined;
              await loadPack(tok);
              return (
                {
                  joined: "You're in each other's pack now.",
                  already: "You're already in this pack.",
                  self: "That's your own code.",
                  full: "That pack is full.",
                }[data?.result ?? ""] ?? "That code didn't match a pack."
              );
            }}
            onReact={(friend, r) => void reactTo(friend, r)}
            onToggleShare={async (shared) => {
              if (!token) return;
              await jsonApi("/api/daily", "PATCH", { day: today, shared }, token).catch(() => null);
              await loadPack(token);
            }}
            onAddToday={() => dailyInput.current?.click()}
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
              const next = { ...profile, ...patch };
              saveProfile(next);
              syncProfile(token, next);
              if (patch.petName !== undefined) setToast("Saved.");
            }}
            onDeleteData={deleteData}
            onManage={() => void manage()}
            memorial={Boolean(profile.memorial)}
            onMemorial={(memorial) => {
              const next = { ...profile, memorial };
              saveProfile(next);
              syncProfile(token, next);
            }}
            reminderHour={reminderHour}
            onReminderHour={(h) => {
              track(h === null ? "reminder_off" : "reminder_on");
              setReminderHour(h);
            }}
            onBackup={() => setBackup("backup")}
            onSignIn={() => setBackup("signin")}
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

      <input
        ref={dailyInput}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="daily-input"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setDailyBusy(true);
          await addPhotos([file], []);
          setDailyBusy(false);
        }}
      />

      <nav className="paper fixed inset-x-0 bottom-0 z-30 border-t border-line pb-[env(safe-area-inset-bottom)]" aria-label="Sections">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                if (id === "pack") track("pack_opened");
                setTab(id);
              }}
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
          onStory={(p) => void storyForPhoto(p)}
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

      {milestone && (
        <MilestoneSheet
          count={milestone}
          name={name}
          photos={photos.filter((p) => daily?.dailyPhotoIds.includes(p.id))}
          look={look}
          onClose={() => setMilestone(null)}
          onStory={() => void storyForRoll(milestone)}
          onSee={() => {
            const roll = photos.filter((p) => daily?.dailyPhotoIds.includes(p.id));
            setMilestone(null);
            setTab("album");
            if (roll.length) setHighlight({ id: "roll", label: "Photo a day", caption: "One a day, every day", photos: roll });
          }}
        />
      )}

      {backupSheet}

      {toast && (
        <div role="status" className="rise fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-md rounded-2xl bg-ink px-5 py-3.5 text-paper shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
