"use client";

import { BellRinging, CheckCircle, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { hourText, named } from "@/i18n/app";
import { useT, type T } from "@/i18n/react";
import { jsonApi } from "@/lib/client";
import { disableReminder, enableReminder, HOURS, pushSupport, sendTestReminder } from "@/lib/reminders";

// Keeping the album safe (an email to get it back on a new phone) and the
// daily reminder. Both are quiet, optional and one tap to undo.

const AUTH_ERRORS = ["bad_email", "slow_down", "email_in_use", "email_not_configured", "send_failed", "wrong_code", "expired", "no_account"] as const;

const authError = (t: T, code?: string) =>
  (AUTH_ERRORS as readonly string[]).includes(code ?? "") ? t(`safety.errors.${code as (typeof AUTH_ERRORS)[number]}`) : t("safety.errors.generic");

export type BackupMode = "backup" | "signin";

export function BackupSheet({ mode, token, petName, warning, onClose, onBackedUp, onSignedIn }: {
  mode: BackupMode;
  token: string | null;
  petName: string;
  warning?: string | null;
  onClose: () => void;
  onBackedUp: (email: string) => void;
  onSignedIn: (token: string) => Promise<void>;
}) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function askForCode() {
    setBusy(true);
    setError(null);
    const res = await jsonApi("/api/auth/code", "POST", { email, purpose: mode, locale: t.locale }, token).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string; devCode?: string } | undefined;
    setBusy(false);
    if (!res?.ok) return setError(authError(t, data?.error));
    setDevCode(data?.devCode ?? null);
    setStep("code");
  }

  async function checkCode() {
    setBusy(true);
    setError(null);
    const res = await jsonApi("/api/auth/verify", "POST", { email, code }, token).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string; token?: string; email?: string } | undefined;
    if (!res?.ok) {
      setBusy(false);
      return setError(authError(t, data?.error));
    }
    if (data?.token) await onSignedIn(data.token);
    else if (data?.email) onBackedUp(data.email);
    setBusy(false);
  }

  const title = mode === "backup" ? named(t, "safety.keepSafe", petName) : t("safety.signInTitle");
  return (
    <Sheet label={title} onClose={onClose}>
      <div className="pb-2">
        <ShieldCheck size={36} className="text-accent" />
        <h2 className="font-display mt-3 text-[2rem] leading-tight">{title}</h2>
        {step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askForCode();
            }}
          >
            <p className="mt-2 text-muted">
              {mode === "backup" ? t("safety.backupBody") : t("safety.signInBody")}
            </p>
            {warning && <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm">{warning}</p>}
            <label htmlFor="backup-email" className="sr-only">
              {t("safety.email")}
            </label>
            <input
              id="backup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("safety.emailPlaceholder")}
              className="mt-5 min-h-13 w-full rounded-full border border-line bg-card px-5 outline-none focus:border-accent"
            />
            <button type="submit" disabled={busy || !email.includes("@")} className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-ink disabled:opacity-50">
              <EnvelopeSimple size={20} /> {busy ? t("safety.sending") : t("safety.emailMe")}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void checkCode();
            }}
          >
            <p className="mt-2 text-muted">{t(mode === "signin" ? "safety.sentSignIn" : "safety.sentBackup", { email })}</p>
            {devCode && <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm">{t("safety.devCode", { code: devCode })}</p>}
            <label htmlFor="backup-code" className="sr-only">
              {t("safety.codeLabel")}
            </label>
            <input
              id="backup-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="mt-5 min-h-13 w-full rounded-full border border-line bg-card px-5 text-center text-2xl tracking-[0.4em] outline-none focus:border-accent"
            />
            <button type="submit" disabled={busy || code.length !== 6} className="mt-3 min-h-13 w-full rounded-full bg-accent font-medium text-accent-ink disabled:opacity-50">
              {busy ? t("safety.checking") : mode === "backup" ? t("safety.keepIt") : t("safety.openMine")}
            </button>
            <button type="button" onClick={() => setStep("email")} className="mt-2 min-h-11 w-full text-sm text-muted">
              {t("safety.otherEmail")}
            </button>
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-center text-sm text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

// A card in the album, once there's something worth losing.
export function BackupNudge({ petName, onAdd, onLater }: { petName: string; onAdd: () => void; onLater: () => void }) {
  const t = useT();
  return (
    <section className="mx-5 mt-4 rounded-2xl border border-dashed border-ink/25 p-4" aria-label={t("safety.nudgeLabel")}>
      <p className="font-display text-xl italic">{named(t, "safety.nudgeTitle", petName)}</p>
      <p className="mt-1 text-sm text-muted">{t("safety.nudgeBody")}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={onAdd} className="min-h-11 flex-1 rounded-full bg-ink px-4 text-sm font-medium text-paper">
          {t("safety.addEmail")}
        </button>
        <button onClick={onLater} className="min-h-11 px-4 text-sm text-muted">
          {t("common.later")}
        </button>
      </div>
    </section>
  );
}

function HourPicker({ hour, onChange, id }: { hour: number; onChange: (h: number) => void; id: string }) {
  const t = useT();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {t("safety.reminderTime")}
      </label>
      <select id={id} value={hour} onChange={(e) => onChange(Number(e.target.value))} className="min-h-11 rounded-full border border-line bg-card px-4 outline-none focus:border-accent">
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {hourText(t.locale, h)}
          </option>
        ))}
      </select>
    </>
  );
}

// Offered right after a photo of the day, when the habit is fresh. Asks for
// notification permission only when the member taps "Remind me".
export function ReminderCard({ token, onOn, onDismiss }: { token: string; onOn: (hour: number) => void; onDismiss: () => void }) {
  const t = useT();
  const [hour, setHour] = useState(18);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const support = pushSupport();
  if (support === "unsupported") return null;

  return (
    <section className="mx-5 mt-4 rounded-2xl bg-card p-4" aria-label={t("safety.reminderLabel")}>
      <div className="flex items-start gap-3">
        <BellRinging size={24} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t("safety.nudgeTomorrow")}</p>
          {support === "ios-install" ? (
            <p className="mt-1 text-sm text-muted">{t("safety.iosCard")}</p>
          ) : support === "denied" ? (
            <p className="mt-1 text-sm text-muted">{t("safety.blockedCard")}</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">{t("safety.oneADay")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <HourPicker id="reminder-hour" hour={hour} onChange={setHour} />
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const result = await enableReminder(token, hour);
                    setBusy(false);
                    if (result === "on") onOn(hour);
                    else setMsg(result === "denied" ? t("safety.noProblem") : t("safety.didntWorkMembership"));
                  }}
                  className="min-h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper disabled:opacity-60"
                >
                  {busy ? t("safety.setting") : t("safety.remindMe")}
                </button>
              </div>
            </>
          )}
          {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
          <button onClick={onDismiss} className="mt-2 min-h-10 text-sm text-muted underline underline-offset-4">
            {support === "ok" ? t("common.noThanks") : t("common.gotIt")}
          </button>
        </div>
      </div>
    </section>
  );
}

// Membership: backup status, sign-in, the reminder and the old access link.
export function SafetySection({ email, token, hour, memorial, copied, onBackup, onSignIn, onCopyLink, onHour }: {
  email: string | null;
  token: string | null;
  hour: number | null;
  memorial: boolean;
  copied: boolean;
  onBackup: () => void;
  onSignIn: () => void;
  onCopyLink: () => void;
  onHour: (hour: number | null) => void;
}) {
  const t = useT();
  const [pick, setPick] = useState(hour ?? 18);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const support = typeof window === "undefined" ? "unsupported" : pushSupport();

  return (
    <>
      <h2 className="font-display mt-10 text-xl italic">{t("safety.keepItSafe")}</h2>
      {email ? (
        <p className="mt-3 flex items-center gap-2">
          <CheckCircle size={20} weight="fill" className="shrink-0 text-accent" /> {t("safety.backedUpTo")} <span className="truncate">{email}</span>
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{t("safety.onThisPhone")}</p>
          {token && (
            <button onClick={onBackup} className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-ink font-medium text-paper">
              <EnvelopeSimple size={20} /> {t("safety.backUp")}
            </button>
          )}
        </>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-x-5">
        <button onClick={onSignIn} className="min-h-11 text-sm text-muted underline underline-offset-4">
          {t("safety.signInOther")}
        </button>
        {token && (
          <button onClick={onCopyLink} className="min-h-11 text-sm text-muted underline underline-offset-4">
            {copied ? t("safety.linkCopied") : t("safety.copyLink")}
          </button>
        )}
      </div>

      {!memorial && token && support !== "unsupported" && (
        <>
          <h2 className="font-display mt-10 text-xl italic">{t("safety.reminderLabel")}</h2>
          {support === "ios-install" ? (
            <p className="mt-2 text-sm text-muted">{t("safety.iosSettings")}</p>
          ) : support === "denied" ? (
            <p className="mt-2 text-sm text-muted">{t("safety.blockedSettings")}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">{t("safety.oneADayShort")}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <HourPicker id="settings-hour" hour={pick} onChange={setPick} />
                {hour === null || hour !== pick ? (
                  <button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const result = await enableReminder(token, pick);
                      setBusy(false);
                      if (result === "on") onHour(pick);
                      setNote(result === "on" ? t("safety.remindersAt", { time: hourText(t.locale, pick) }) : result === "denied" ? t("safety.notAllowed") : t("safety.didntWork"));
                    }}
                    className="min-h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper disabled:opacity-60"
                  >
                    {hour === null ? t("safety.turnOn") : t("safety.changeTime")}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => setNote((await sendTestReminder(token)) ? t("safety.testSent") : t("safety.testFailed"))}
                      className="min-h-11 rounded-full border border-ink/20 px-4 text-sm"
                    >
                      {t("safety.sendNow")}
                    </button>
                    <button
                      onClick={async () => {
                        await disableReminder(token);
                        onHour(null);
                        setNote(t("safety.off"));
                      }}
                      className="min-h-11 px-3 text-sm text-muted underline underline-offset-4"
                    >
                      {t("safety.turnOff")}
                    </button>
                  </>
                )}
              </div>
              {note && <p className="mt-2 text-sm text-muted">{note}</p>}
            </>
          )}
        </>
      )}
    </>
  );
}
