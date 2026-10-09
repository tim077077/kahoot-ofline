import { accessSync, constants } from "node:fs";
import { getClaude, hasClaudeKey } from "@/lib/claude";
import { CLAUDE_MODEL } from "@/lib/config";
import { storeOr503 } from "@/lib/http";
import { instagramConfigured, instagramWhoAmI, InstagramError } from "@/lib/instagram";
import { dataDir, ensureDir } from "@/lib/local";
import { getSettings } from "@/lib/posting";
import { listPosts } from "@/lib/queue";
import { getAuth, officialConfig } from "@/lib/tiktok-official";

// The dashboard's "what's working, what's not". Each check runs for real
// where it can (a free API call), and says how to fix what's off.

export type Check = { id: string; label: string; state: "ok" | "warn" | "off" | "error"; detail: string; fix?: string };

const ago = (iso: string) => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.round(min / 60)} h ago` : `${Math.round(min / 1440)} days ago`;
};

async function claudeCheck(): Promise<Check> {
  const base = { id: "claude", label: "Claude (copies formats, writes slides, analyses)" };
  if (!hasClaudeKey()) return { ...base, state: "off", detail: "Demo mode: no ANTHROPIC_API_KEY, so every AI result is example output.", fix: "Add ANTHROPIC_API_KEY to slides/.env.local and restart." };
  try {
    await getClaude().models.retrieve(CLAUDE_MODEL, {}, { timeout: 8000, maxRetries: 0 });
    return { ...base, state: "ok", detail: `Key works, model ${CLAUDE_MODEL}.` };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return { ...base, state: "error", detail: "The API key was rejected.", fix: "Make a new key at console.anthropic.com and update .env.local." };
    if (status === 404) return { ...base, state: "error", detail: `Model ${CLAUDE_MODEL} not available on this key.`, fix: "Remove CLAUDE_MODEL from .env.local to use the default." };
    return { ...base, state: "warn", detail: "Couldn't reach the Anthropic API just now.", fix: "Check your internet connection, then Re-check." };
  }
}

async function instagramCheck(): Promise<Check> {
  const base = { id: "instagram", label: "Instagram (copy a creator by username)" };
  if (!instagramConfigured()) return { ...base, state: "off", detail: "Not set up. Copying by username and the Instagram viral finder are off.", fix: "README → Copy a creator: set IG_USER_ID and IG_ACCESS_TOKEN (about 20 min)." };
  try {
    const name = await instagramWhoAmI();
    return { ...base, state: "ok", detail: `Token works${name ? ` (@${name})` : ""}. Tokens last 60 days.` };
  } catch (err) {
    const code = err instanceof InstagramError ? err.code : "failed";
    if (code === "token_expired") return { ...base, state: "error", detail: "Your token expired.", fix: "Make a new long-lived token (README → Copy a creator, step 3)." };
    return { ...base, state: "error", detail: `Instagram said no (${code}).`, fix: "Check IG_USER_ID and the token's permissions." };
  }
}

async function finderCheck(store: Exclude<ReturnType<typeof storeOr503>, Response>): Promise<Check> {
  const base = { id: "finder", label: "Viral finder (Instagram hashtags)" };
  if (!instagramConfigured()) return { ...base, state: "off", detail: "Needs Instagram set up. The TikTok swipe file works without it." };
  const raw = await store.get("status:finder");
  const last = raw ? (JSON.parse(raw) as { ok: boolean; code?: string; at: string }) : null;
  if (!last) return { ...base, state: "warn", detail: "Not tried yet. Search a hashtag to test it." };
  if (last.ok) return { ...base, state: "ok", detail: `Last search worked ${ago(last.at)}.` };
  if (last.code === "no_hashtag_access") return { ...base, state: "error", detail: "Meta blocked hashtag search for your app.", fix: "In your Meta app, add the \"Instagram Public Content Access\" feature (may need Meta's review)." };
  return { ...base, state: "error", detail: `Last search failed ${ago(last.at)} (${last.code}).` };
}

async function draftsCheck(store: Exclude<ReturnType<typeof storeOr503>, Response>): Promise<Check> {
  const base = { id: "drafts", label: "Official TikTok drafts (auto-save to your inbox)" };
  const { hasKeys, publicUrl } = officialConfig();
  if (!hasKeys) return { ...base, state: "off", detail: "Not set up.", fix: "README → Official TikTok drafts: make a TikTok developer app, set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET." };
  if (!publicUrl) return { ...base, state: "off", detail: "Needs a public https address so TikTok can fetch the slides.", fix: "Start a Cloudflare tunnel and set SLIDEDROP_PUBLIC_URL (README → Official TikTok drafts)." };
  const reachable = await fetch(`${publicUrl}/api/tiktok/callback`, { signal: AbortSignal.timeout(6000), cache: "no-store", redirect: "manual" })
    .then(() => true)
    .catch(() => false);
  if (!reachable) return { ...base, state: "error", detail: `${publicUrl} doesn't answer.`, fix: "Is the tunnel running? Start it, then Re-check." };
  const auth = await getAuth(store);
  if (!auth) return { ...base, state: "warn", detail: "Tunnel works. TikTok account not connected yet.", fix: "Click Connect TikTok." };
  if (auth.refreshExpiresAt < Date.now()) return { ...base, state: "error", detail: "TikTok login expired.", fix: "Click Connect TikTok again." };
  const auto = (await getSettings(store)).autoDrafts;
  return { ...base, state: "ok", detail: `Connected. Auto-save to drafts is ${auto ? "on" : "off"}.` };
}

async function extensionCheck(store: Exclude<ReturnType<typeof storeOr503>, Response>): Promise<Check> {
  const base = { id: "extension", label: "SlideDrop Poster extension (post now from tiktok.com)" };
  const seen = await store.get("extension:lastSeen");
  if (!seen) return { ...base, state: "off", detail: "Never connected.", fix: "Load slides/extension in Chrome (README → Extension), then open tiktok.com." };
  const fresh = Date.now() - Date.parse(seen) < 10 * 60 * 1000;
  return fresh
    ? { ...base, state: "ok", detail: `Connected (last seen ${ago(seen)}).` }
    : { ...base, state: "warn", detail: `Last seen ${ago(seen)}.`, fix: "Open or refresh a tiktok.com tab to reconnect." };
}

function storageCheck(): Check {
  const base = { id: "storage", label: "Local storage (.data folder)" };
  try {
    const dir = ensureDir(dataDir());
    accessSync(dir, constants.W_OK);
    return { ...base, state: "ok", detail: dir };
  } catch {
    return { ...base, state: "error", detail: `Can't write to ${dataDir()}.`, fix: "Check folder permissions, or set SLIDEDROP_DATA_DIR." };
  }
}

export async function GET() {
  const store = storeOr503();
  if (store instanceof Response) return store;
  const checks = await Promise.all([claudeCheck(), instagramCheck(), finderCheck(store), draftsCheck(store), extensionCheck(store)]);
  const posts = listPosts();
  const count = (s: string) => posts.filter((p) => p.status === s).length;
  return Response.json({
    checks: [storageCheck(), ...checks],
    queue: { ready: count("ready"), sending: count("sending"), inDrafts: count("in_drafts"), posted: count("posted"), failed: count("failed") },
    tiktokAccount: Boolean(await getAuth(store)),
  });
}
