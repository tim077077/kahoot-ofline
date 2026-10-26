"use client";

import { useEffect, useRef } from "react";
import { Mascot } from "@/components/Mascot";
import { reportCrash } from "@/lib/crash";
import { I18nProvider, useT } from "@/i18n/react";

// What someone sees instead of a blank screen when the app breaks: a calm
// note, their photos are safe, and a way back. The crash is reported so we
// hear about it without them having to tell us.
export default function CrashPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => reportCrash(error, "render"), [error]);
  return (
    <I18nProvider>
      <CrashNote retry={retry} />
    </I18nProvider>
  );
}

function CrashNote({ retry }: { retry: () => void }) {
  const t = useT();
  const tries = useRef(0);
  return (
    <main className="paper flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <Mascot size={120} still />
      <h1 className="font-display mt-6 text-3xl">{t("crash.title")}</h1>
      <p className="mt-2 max-w-xs text-muted">{t("crash.body")}</p>
      <button
        // Re-render first; if the same thing breaks again, start the page fresh.
        onClick={() => (tries.current++ === 0 ? retry() : location.reload())}
        className="mt-8 min-h-13 w-full max-w-xs rounded-full bg-accent font-medium text-accent-ink"
      >
        {t("common.tryAgain")}
      </button>
    </main>
  );
}
