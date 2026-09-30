"use client";

import { BellRinging, CheckCircle, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { Sheet } from "@/components/Sheet";
import { jsonApi } from "@/lib/client";
import { disableReminder, enableReminder, HOURS, hourLabel, pushSupport, sendTestReminder } from "@/lib/reminders";

// Keeping the album safe (an email to get it back on a new phone) and the
// daily reminder. Both are quiet, optional and one tap to undo.

const AUTH_ERRORS: Record<string, string> = {
  bad_email: "That email doesn't look right.",
  slow_down: "That's a few codes in a row. Wait a few minutes, then try again.",
  email_in_use: "That email already keeps another album. Sign in with it instead.",
  email_not_configured: "Email isn't switched on yet. Copy your access link for now.",
  send_failed: "The email didn't send. Try again in a moment.",
  wrong_code: "That code didn't match. Check the newest email.",
  expired: "That code has expired. Ask for a new one.",
  no_account: "Add a photo first, then you can back up the album.",
};

const authError = (code?: string) => AUTH_ERRORS[code ?? ""] ?? "Something went wrong. Try again in a moment.";

export type BackupMode = "backup" | "signin";

export function BackupSheet({ mode, token, name, warning, onClose, onBackedUp, onSignedIn }: {
  mode: BackupMode;
  token: string | null;
  name: string;
  warning?: string | null;
  onClose: () => void;
  onBackedUp: (email: string) => void;
  onSignedIn: (token: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  async function askForCode() {
    setBusy(true);
    setError(null);
    const res = await jsonApi("/api/auth/code", "POST", { email, purpose: mode }, token).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string; devCode?: string } | undefined;
    setBusy(false);
    if (!res?.ok) return setError(authError(data?.error));
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
      return setError(authError(data?.error));
    }
    if (data?.token) await onSignedIn(data.token);
    else if (data?.email) onBackedUp(data.email);
    setBusy(false);
  }

  const title = mode === "backup" ? `Keep ${name === "Your pet" ? "the" : `${name}'s`} album safe` : "Sign in to your album";
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
              {mode === "backup"
                ? "Add your email and you can get the album back on a new phone. No password, no newsletters."
                : "Use the email you backed up with. We'll send a 6-digit code."}
            </p>
            {warning && <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm">{warning}</p>}
            <label htmlFor="backup-email" className="sr-only">
              Email
            </label>
            <input
              id="backup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-5 min-h-13 w-full rounded-full border border-line bg-card px-5 outline-none focus:border-accent"
            />
            <button type="submit" disabled={busy || !email.includes("@")} className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-accent-ink disabled:opacity-50">
              <EnvelopeSimple size={20} /> {busy ? "Sending" : "Email me a code"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void checkCode();
            }}
          >
            <p className="mt-2 text-muted">
              {mode === "signin" ? "If that email keeps an album, a code is on its way to " : "We sent a code to "}
              <span className="text-ink">{email}</span>. It works for 15 minutes.
            </p>
            {devCode && <p className="mt-3 rounded-xl bg-sand px-4 py-3 text-sm">Local test mode, no email sent. Your code is {devCode}.</p>}
            <label htmlFor="backup-code" className="sr-only">
              6-digit code
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
              {busy ? "Checking" : mode === "backup" ? "Keep it safe" : "Open my album"}
            </button>
            <button type="button" onClick={() => setStep("email")} className="mt-2 min-h-11 w-full text-sm text-muted">
              Use a different email
            </button>
          </form>
        )}
        {error && <p role="alert" className="mt-3 text-center text-sm text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

// A card in the album, once there's something worth losing.
export function BackupNudge({ name, onAdd, onLater }: { name: string; onAdd: () => void; onLater: () => void }) {
  return (
    <section className="mx-5 mt-4 rounded-2xl border border-dashed border-ink/25 p-4" aria-label="Back up the album">
      <p className="font-display text-xl italic">Keep {name === "Your pet" ? "this" : `${name}'s`} album safe</p>
      <p className="mt-1 text-sm text-muted">Right now it lives on this phone. Add your email so a new phone can open it too.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={onAdd} className="min-h-11 flex-1 rounded-full bg-ink px-4 text-sm font-medium text-paper">
          Add my email
        </button>
        <button onClick={onLater} className="min-h-11 px-4 text-sm text-muted">
          Later
        </button>
      </div>
    </section>
  );
}

function HourPicker({ hour, onChange, id }: { hour: number; onChange: (h: number) => void; id: string }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Reminder time
      </label>
      <select id={id} value={hour} onChange={(e) => onChange(Number(e.target.value))} className="min-h-11 rounded-full border border-line bg-card px-4 outline-none focus:border-accent">
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {hourLabel(h)}
          </option>
        ))}
      </select>
    </>
  );
}

// Offered right after a photo of the day, when the habit is fresh. Asks for
// notification permission only when the member taps "Remind me".
export function ReminderCard({ token, onOn, onDismiss }: { token: string; onOn: (hour: number) => void; onDismiss: () => void }) {
  const [hour, setHour] = useState(18);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const support = pushSupport();
  if (support === "unsupported") return null;

  return (
    <section className="mx-5 mt-4 rounded-2xl bg-card p-4" aria-label="Daily reminder">
      <div className="flex items-start gap-3">
        <BellRinging size={24} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">A nudge tomorrow?</p>
          {support === "ios-install" ? (
            <p className="mt-1 text-sm text-muted">
              On iPhone, reminders work once the album is on your Home Screen: tap Share, then &ldquo;Add to Home Screen&rdquo;, and open it from there.
            </p>
          ) : support === "denied" ? (
            <p className="mt-1 text-sm text-muted">Notifications are blocked for this site. Allow them in your browser settings to get a reminder.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">One reminder a day, only if today&apos;s photo isn&apos;t in yet. Nothing else.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <HourPicker id="reminder-hour" hour={hour} onChange={setHour} />
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const result = await enableReminder(token, hour);
                    setBusy(false);
                    if (result === "on") onOn(hour);
                    else setMsg(result === "denied" ? "No problem, no reminders." : "That didn't work. Try again from Membership.");
                  }}
                  className="min-h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper disabled:opacity-60"
                >
                  {busy ? "Setting" : "Remind me"}
                </button>
              </div>
            </>
          )}
          {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
          <button onClick={onDismiss} className="mt-2 min-h-10 text-sm text-muted underline underline-offset-4">
            {support === "ok" ? "No thanks" : "Got it"}
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
  const [pick, setPick] = useState(hour ?? 18);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const support = typeof window === "undefined" ? "unsupported" : pushSupport();

  return (
    <>
      <h2 className="font-display mt-10 text-xl italic">Keep it safe</h2>
      {email ? (
        <p className="mt-3 flex items-center gap-2">
          <CheckCircle size={20} weight="fill" className="shrink-0 text-accent" /> Backed up to <span className="truncate">{email}</span>
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">The album lives on this phone until you add an email.</p>
          {token && (
            <button onClick={onBackup} className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-ink font-medium text-paper">
              <EnvelopeSimple size={20} /> Back up with email
            </button>
          )}
        </>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-x-5">
        <button onClick={onSignIn} className="min-h-11 text-sm text-muted underline underline-offset-4">
          Sign in to another album
        </button>
        {token && (
          <button onClick={onCopyLink} className="min-h-11 text-sm text-muted underline underline-offset-4">
            {copied ? "Access link copied" : "Copy my access link"}
          </button>
        )}
      </div>

      {!memorial && token && support !== "unsupported" && (
        <>
          <h2 className="font-display mt-10 text-xl italic">Daily reminder</h2>
          {support === "ios-install" ? (
            <p className="mt-2 text-sm text-muted">On iPhone, add the album to your Home Screen (Share, then &ldquo;Add to Home Screen&rdquo;) and open it from there to turn this on.</p>
          ) : support === "denied" ? (
            <p className="mt-2 text-sm text-muted">Notifications are blocked for this site. Allow them in your browser settings first.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">One a day, only if today&apos;s photo isn&apos;t in yet.</p>
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
                      setNote(result === "on" ? `Reminders at ${hourLabel(pick)}.` : result === "denied" ? "Notifications weren't allowed." : "That didn't work. Try again.");
                    }}
                    className="min-h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper disabled:opacity-60"
                  >
                    {hour === null ? "Turn on" : "Change time"}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={async () => setNote((await sendTestReminder(token)) ? "Sent. It should arrive in a few seconds." : "Couldn't send one right now.")}
                      className="min-h-11 rounded-full border border-ink/20 px-4 text-sm"
                    >
                      Send one now
                    </button>
                    <button
                      onClick={async () => {
                        await disableReminder(token);
                        onHour(null);
                        setNote("Reminders are off.");
                      }}
                      className="min-h-11 px-3 text-sm text-muted underline underline-offset-4"
                    >
                      Turn off
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
