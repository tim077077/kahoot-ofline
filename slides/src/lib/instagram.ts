// Reads another creator's public posts through Instagram's official Business
// Discovery API: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery
//
// What it needs (see README → "Copy a creator"):
// - your own Instagram professional (business or creator) account, linked to a
//   Facebook Page, and a Meta app you're an admin of;
// - IG_USER_ID (that account's id) and IG_ACCESS_TOKEN (a Facebook user token
//   with instagram_basic, instagram_manage_insights, pages_read_engagement).
//
// What it can't do: read personal (non-professional) or age-gated accounts.
// Most creators who post carousels for reach are on professional accounts.

export type InstagramPost = {
  caption: string;
  type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  likes: number;
  comments: number;
  timestamp: string;
  permalink: string;
  // Slide image URLs, in order (a single image for IMAGE posts).
  images: string[];
};

export type InstagramProfile = { username: string; followers: number; mediaCount: number; posts: InstagramPost[] };

export class InstagramError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "not_found" | "rate_limited" | "token_expired" | "failed",
  ) {
    super(message);
  }
}

export const IMAGE_HOST_SUFFIXES = [".cdninstagram.com", ".fbcdn.net"];

const USERNAME = /^[a-z0-9._]{1,30}$/;
const PROFILE_HOSTS = ["instagram.com", "www.instagram.com", "m.instagram.com"];
const TIMEOUT_MS = 12000;

// "@name", "name" or "https://www.instagram.com/name/" → "name".
export function parseInstagramHandle(raw: string): string | null {
  let input = raw.trim();
  // Links copied on a phone often lose the https://.
  if (/^((www|m)\.)?instagram\.com\//i.test(input)) input = `https://${input}`;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !PROFILE_HOSTS.includes(url.hostname)) return null;
    input = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } catch {
    // Not a URL: a plain handle.
  }
  const name = input.replace(/^@/, "").toLowerCase();
  return USERNAME.test(name) ? name : null;
}

export function instagramConfigured() {
  return Boolean(process.env.IG_USER_ID && process.env.IG_ACCESS_TOKEN);
}

type GraphMedia = {
  caption?: string;
  media_type?: InstagramPost["type"];
  media_url?: string;
  like_count?: number;
  comments_count?: number;
  timestamp?: string;
  permalink?: string;
  children?: { data?: { media_type?: string; media_url?: string }[] };
};

type GraphResponse = {
  business_discovery?: { username?: string; followers_count?: number; media_count?: number; media?: { data?: GraphMedia[] } };
  error?: { code?: number; error_subcode?: number; message?: string };
};

function toPost(m: GraphMedia): InstagramPost | null {
  if (!m.media_type) return null;
  const slides =
    m.media_type === "CAROUSEL_ALBUM"
      ? (m.children?.data ?? []).filter((c) => c.media_type === "IMAGE" && c.media_url).map((c) => c.media_url!)
      : m.media_type === "IMAGE" && m.media_url
        ? [m.media_url]
        : [];
  // Business Discovery sometimes leaves out children; the album's own
  // media_url is its first slide, which is still the hook.
  const images = slides.length > 0 ? slides : m.media_type === "CAROUSEL_ALBUM" && m.media_url ? [m.media_url] : [];
  return {
    caption: (m.caption ?? "").slice(0, 2200),
    type: m.media_type,
    likes: Math.max(0, m.like_count ?? 0),
    comments: Math.max(0, m.comments_count ?? 0),
    timestamp: m.timestamp ?? "",
    permalink: m.permalink ?? "",
    images,
  };
}

export async function fetchInstagramProfile(username: string, limit = 50): Promise<InstagramProfile> {
  if (!instagramConfigured()) throw new InstagramError("IG_USER_ID and IG_ACCESS_TOKEN are not set", "not_configured");
  const version = process.env.IG_GRAPH_VERSION || "v24.0";
  const mediaFields = "caption,media_type,media_url,like_count,comments_count,timestamp,permalink,children{media_type,media_url}";
  const fields = `business_discovery.username(${username}){username,followers_count,media_count,media.limit(${limit}){${mediaFields}}}`;
  const url = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(process.env.IG_USER_ID!)}`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", process.env.IG_ACCESS_TOKEN!);

  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" }).catch(() => null);
  if (!res) throw new InstagramError("Instagram didn't answer", "failed");
  const data = (await res.json().catch(() => ({}))) as GraphResponse;

  if (!res.ok || data.error) {
    const code = data.error?.code;
    // 4, 17, 32, 613: app, user or page rate limits. 190: token invalid or expired.
    if (code === 4 || code === 17 || code === 32 || code === 613) throw new InstagramError("Rate limited", "rate_limited");
    if (code === 190) throw new InstagramError("Access token expired or invalid", "token_expired");
    // 110 / 2207013 (and most other 400s): no such professional account.
    if (res.status === 400 || code === 110 || code === 100) throw new InstagramError(data.error?.message ?? "Not found", "not_found");
    throw new InstagramError(data.error?.message ?? `HTTP ${res.status}`, "failed");
  }

  const bd = data.business_discovery;
  if (!bd) throw new InstagramError("No profile in the response", "not_found");
  return {
    username: bd.username ?? username,
    followers: bd.followers_count ?? 0,
    mediaCount: bd.media_count ?? 0,
    posts: (bd.media?.data ?? []).map(toPost).filter((p): p is InstagramPost => p !== null),
  };
}

// The posts worth copying: carousels ranked by engagement (a comment counts
// for more than a like: it takes more effort). Falls back to single images
// when the account posts few carousels.
export function topPosts(posts: InstagramPost[], count = 4): InstagramPost[] {
  const score = (p: InstagramPost) => p.likes + 3 * p.comments;
  const withImages = posts.filter((p) => p.images.length > 0);
  const carousels = withImages.filter((p) => p.type === "CAROUSEL_ALBUM").sort((a, b) => score(b) - score(a));
  const singles = withImages.filter((p) => p.type !== "CAROUSEL_ALBUM").sort((a, b) => score(b) - score(a));
  return [...carousels, ...singles].slice(0, count);
}

// A few numbers about the whole feed, so Claude knows what "doing well" means
// for this account and how often it posts.
export function feedStats(profile: InstagramProfile) {
  const posts = profile.posts;
  const engagement = posts.map((p) => p.likes + p.comments).sort((a, b) => a - b);
  const median = engagement.length ? engagement[Math.floor(engagement.length / 2)] : 0;
  const times = posts.map((p) => Date.parse(p.timestamp)).filter(Number.isFinite).sort((a, b) => a - b);
  const weeks = times.length > 1 ? (times[times.length - 1] - times[0]) / (7 * 24 * 3600 * 1000) : 0;
  const perWeek = weeks > 0 ? Math.round((times.length / weeks) * 10) / 10 : null;
  const carouselShare = posts.length ? Math.round((posts.filter((p) => p.type === "CAROUSEL_ALBUM").length / posts.length) * 100) : 0;
  return { followers: profile.followers, postsRead: posts.length, medianEngagement: median, postsPerWeek: perWeek, carouselShare };
}
