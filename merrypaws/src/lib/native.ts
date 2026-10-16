"use client";

import { Capacitor } from "@capacitor/core";

// The phone's own features in the Android and iOS apps: the system share
// sheet, saving straight into Photos, haptics. On the web every helper here
// is a no-op or returns "web" so callers fall back to the browser's way.
// Plugins load only when used.

export const isNative = () => Capacitor.isNativePlatform();

function base64Of(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function cacheFile(blob: Blob, filename: string) {
  const { Directory, Filesystem } = await import("@capacitor/filesystem");
  const { uri } = await Filesystem.writeFile({ path: filename, data: await base64Of(blob), directory: Directory.Cache });
  return uri;
}

// The system share sheet with the image itself (Android's WebView can't share
// files through navigator.share).
export async function nativeShare(blob: Blob, filename: string, title: string): Promise<"shared" | "cancelled" | "web"> {
  if (!isNative()) return "web";
  const { Share } = await import("@capacitor/share");
  try {
    await Share.share({ title, files: [await cacheFile(blob, filename)] });
    return "shared";
  } catch (err) {
    if (String((err as Error)?.message ?? err).toLowerCase().includes("cancel")) return "cancelled";
    throw err;
  }
}

const ALBUM = "Paw Pictures";

// Android saves into a named album, so find (or make) ours.
async function androidAlbum() {
  const { Media } = await import("@capacitor-community/media");
  const find = async () => (await Media.getAlbums()).albums.find((a) => a.name === ALBUM)?.identifier;
  const found = await find();
  if (found) return found;
  await Media.createAlbum({ name: ALBUM });
  return find();
}

// Straight into the phone's Photos, no share sheet in between.
export async function saveToPhotos(blob: Blob, filename: string): Promise<"saved" | "web"> {
  if (!isNative()) return "web";
  const { Media } = await import("@capacitor-community/media");
  const path = await cacheFile(blob, filename);
  const albumIdentifier = Capacitor.getPlatform() === "android" ? await androidAlbum() : undefined;
  await Media.savePhoto({ path, albumIdentifier, fileName: filename.replace(/\.\w+$/, "") });
  return "saved";
}

// A light tap for the moments that deserve one (a photo of the day, a milestone).
export function tap(strong = false) {
  if (!isNative()) return;
  void import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle, NotificationType }) =>
      strong ? Haptics.notification({ type: NotificationType.Success }) : Haptics.impact({ style: ImpactStyle.Light }),
    )
    .catch(() => {});
}
