import type { Screenshot } from "./analyze";
import { fetchImage, fetchWithTimeout } from "./images";

// Reads what TikTok officially exposes about a public post through its oEmbed
// endpoint: the caption and the cover image (for a slideshow, usually the hook
// slide). The other slides aren't available this way; getting them would mean
// scraping TikTok, which breaks their terms and breaks whenever they change
// the site. Screenshots cover the middle slides and the call to action.

export type TikTokPost = { caption: string; author: string; cover?: Screenshot };

const POST_HOSTS = ["tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"];
const IMAGE_HOST_SUFFIXES = [".tiktokcdn.com", ".tiktokcdn-us.com", ".tiktokcdn-eu.com", ".ibyteimg.com"];

export class TikTokLinkError extends Error {}

export function parseTikTokUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" && POST_HOSTS.includes(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export async function fetchTikTokPost(link: string): Promise<TikTokPost> {
  const url = parseTikTokUrl(link);
  if (!url) throw new TikTokLinkError("Not a TikTok link");

  const res = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`).catch(() => null);
  if (!res?.ok) throw new TikTokLinkError("TikTok didn't return this post (private, deleted or not embeddable)");
  const data = (await res.json().catch(() => ({}))) as { title?: string; author_name?: string; thumbnail_url?: string };

  return {
    caption: (data.title ?? "").slice(0, 2200),
    author: (data.author_name ?? "").slice(0, 100),
    cover: data.thumbnail_url ? await fetchImage(data.thumbnail_url, IMAGE_HOST_SUFFIXES) : undefined,
  };
}
