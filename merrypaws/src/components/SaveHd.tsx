"use client";

import { DownloadSimple } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/react";
import { downloadUrl } from "@/lib/client";
import { isNative, saveToPhotos, tap } from "@/lib/native";

// "Save in HD" for an unlocked portrait. On the web it's a plain download;
// in the apps it goes straight into the phone's Photos.
export function SaveHd({ id, className, children }: { id: string; className: string; children?: ReactNode }) {
  const t = useT();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function save(e: React.MouseEvent) {
    if (!isNative()) return;
    e.preventDefault();
    if (state === "saving") return;
    setState("saving");
    try {
      const res = await fetch(downloadUrl(id));
      if (!res.ok) throw new Error(`download ${res.status}`);
      const blob = await res.blob();
      await saveToPhotos(blob, `paw-pictures-${id.slice(0, 8)}.${blob.type === "image/png" ? "png" : "jpg"}`);
      tap(true);
      setState("saved");
    } catch (err) {
      console.error("save to photos", err);
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  }

  const label =
    state === "saving" ? t("common.saving") : state === "saved" ? t("common.savedToPhotos") : state === "failed" ? t("common.saveFailed") : children ?? t("common.saveHd");
  return (
    <a href={downloadUrl(id)} download onClick={(e) => void save(e)} className={className}>
      <DownloadSimple size={20} weight="bold" /> {label}
    </a>
  );
}
