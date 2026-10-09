import { getPost, updatePost, type QueuedPost } from "./queue";
import type { Store } from "./store";
import { explainError, getAuth, officialConfig, publishStatus, sendToDrafts, TikTokApiError } from "./tiktok-official";

// Moves queued posts out through the official drafts route, and keeps the
// settings for how new posts leave (see queue.ts for the three channels).

export type Settings = {
  // Send every new post to TikTok drafts as soon as it's queued.
  autoDrafts: boolean;
  // Seconds the extension waits between posts. Don't go below 30.
  extensionGap: number;
  // Let the extension attach a sound from TikTok's web library.
  extensionSound: boolean;
};

const SETTINGS_KEY = "settings";
const DEFAULTS: Settings = { autoDrafts: false, extensionGap: 45, extensionSound: true };

export async function getSettings(store: Store): Promise<Settings> {
  const raw = await store.get(SETTINGS_KEY);
  return { ...DEFAULTS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}) };
}

export async function saveSettings(store: Store, input: Partial<Settings>): Promise<Settings> {
  const current = await getSettings(store);
  const next: Settings = {
    autoDrafts: typeof input.autoDrafts === "boolean" ? input.autoDrafts : current.autoDrafts,
    extensionGap: Number.isFinite(input.extensionGap) ? Math.min(600, Math.max(30, Math.round(input.extensionGap!))) : current.extensionGap,
    extensionSound: typeof input.extensionSound === "boolean" ? input.extensionSound : current.extensionSound,
  };
  await store.set(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function draftsReady(store: Store) {
  const { hasKeys, publicUrl } = officialConfig();
  return hasKeys && Boolean(publicUrl) && Boolean(await getAuth(store));
}

export async function sendPostToDrafts(store: Store, id: string): Promise<QueuedPost | null> {
  const post = getPost(id);
  if (!post) return null;
  try {
    updatePost(id, { status: "sending", channel: "drafts" });
    const publishId = await sendToDrafts(store, post);
    return updatePost(id, { status: "sending", channel: "drafts", tiktokId: publishId });
  } catch (err) {
    const code = err instanceof TikTokApiError ? err.code : "failed";
    if (!(err instanceof TikTokApiError)) console.error("send to drafts failed", err);
    return updatePost(id, { status: "failed", channel: "drafts", error: explainError(code) });
  }
}

// TikTok downloads the slides in the background; ask how it went.
export async function refreshDraft(store: Store, id: string): Promise<QueuedPost | null> {
  const post = getPost(id);
  if (!post || post.channel !== "drafts" || post.status !== "sending" || !post.tiktokId) return post;
  try {
    const { status, failReason } = await publishStatus(store, post.tiktokId);
    if (status === "SEND_TO_USER_INBOX") return updatePost(id, { status: "in_drafts" });
    if (status === "PUBLISH_COMPLETE") return updatePost(id, { status: "posted" });
    if (status === "FAILED") return updatePost(id, { status: "failed", error: explainError(failReason ?? "failed") });
    return post;
  } catch (err) {
    return err instanceof TikTokApiError ? updatePost(id, { error: explainError(err.code) }) : post;
  }
}
