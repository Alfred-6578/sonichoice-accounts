"use client";

/**
 * Sign in. The first screen anybody sees, and the only one outside the shell.
 *
 * While accounts live in the browser this is a demo of who-sees-what, not a
 * lock on the figures — see lib/directory.ts. The demo accounts panel at the
 * foot exists for showing the app to the accounting team and goes when there
 * is a real service.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, Eye, EyeOff, Lock, Split } from "lucide-react";
import { signIn, useCurrentUser } from "@/lib/directory";
import { DEMO_PASSWORD, seedUsers } from "@/data/demo";
import {
  Avatar,
  Field,
  FormMessage,
  INPUT,
  PRIMARY,
  RoleBadge,
  syne,
} from "@/components/shared";

const DEMO_ACCOUNTS = seedUsers();

/** Only ever send someone back to a page of this app. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next") || "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const POINTS = [
  {
    Icon: BookOpenCheck,
    title: "Written once",
    body: "Enter the day; the day book and monthly sheet add themselves up.",
  },
  {
    Icon: Split,
    title: "Spend kept apart from cash moved",
    body: "Loans and withdrawals are counted, but not as money spent.",
  },
  {
    Icon: Lock,
    title: "Months close",
    body: "A month stays open a week after it ends, then its figures are fixed.",
  },
];

export default function LoginPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  /* Signed in already, or just now: on to wherever they were heading. */
  useEffect(() => {
    if (user) router.replace(nextPath());
  }, [user, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    const result = signIn(email, password);
    if (!result.ok) setError(result.error);
  };

  const fill = (address: string) => {
    setEmail(address);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* THE DARK SIDE — what this is, for someone who has only known the paper */}
      <aside className="hidden lg:flex flex-col justify-between bg-auth-bg p-12 xl:p-16 relative overflow-hidden">
        {/* Ruled lines, faintly, like the book it replaces. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] text-white"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent 39px, currentColor 39px, currentColor 40px)",
          }}
        />
        <div aria-hidden className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-amber/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber flex items-center justify-center font-bold text-ink text-lg">
            S
          </div>
          <div>
            <div className={`${syne.className} text-white text-base font-bold leading-tight`}>
              SONICHOICE
            </div>
            <div className="text-[11px] uppercase tracking-widest text-amber leading-tight">
              Accounts
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className={`${syne.className} text-4xl xl:text-[44px] leading-[1.1] font-bold text-white`}>
            Every branch&apos;s book, <span className="text-amber">in one place.</span>
          </h1>
          <p className="mt-4 text-[15px] text-auth-text-dim leading-relaxed">
            The daily expense sheet, the revenue ledger and the monthly roll-up —
            from one entry a day, for every branch.
          </p>

          <ul className="mt-10 space-y-3">
            {POINTS.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="flex gap-4 p-4 rounded-xl bg-auth-bg-raised/70 border border-white/5"
              >
                <span className="w-9 h-9 shrink-0 rounded-lg bg-amber/15 text-amber flex items-center justify-center">
                  <Icon className="w-4.5 h-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="block text-[13px] text-auth-text-dim mt-0.5">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[12px] text-auth-text-dim">
          Sonichoice Logistics · Accounting department
        </div>
      </aside>

      {/* THE FORM */}
      <main className="min-h-dvh lg:min-h-0 flex flex-col justify-center px-4 tny:px-6 py-10">
        <div className="w-full max-w-[400px] mx-auto">
          {/* Mark, for phones where the dark panel is hidden. */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg bg-amber flex items-center justify-center font-bold text-ink">
              S
            </div>
            <div>
              <div className={`${syne.className} text-ink text-sm font-bold leading-tight`}>
                SONICHOICE
              </div>
              <div className="text-[10px] uppercase tracking-widest text-amber-hover leading-tight">
                Accounts
              </div>
            </div>
          </div>

          <h2 className={`${syne.className} text-[28px] font-bold text-ink leading-tight`}>
            Sign in
          </h2>
          <p className="text-sm text-ink-muted mt-1.5 mb-8">
            Use the email and password your admin set up for you.
          </p>

          {user === null && (
            <form onSubmit={submit} noValidate className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@sonichoicelogistics.com"
                  className={INPUT}
                />
              </Field>

              <Field label="Password">
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className={`${INPUT} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center text-ink-subtle hover:text-ink cursor-pointer"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <FormMessage error={error} />

              <button type="submit" className={`${PRIMARY} w-full h-12 text-[15px]`}>
                Sign in
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[12px] text-ink-muted text-center pt-1">
                Forgotten your password? An admin can set a new one from Staff.
              </p>
            </form>
          )}

          {/* DEMO ACCOUNTS — remove with the move to a real service */}
          {user === null && (
            <div className="mt-10 rounded-xl border border-dashed border-border-strong bg-surface-raised/60 p-3">
              <div className="px-1 pb-2 text-[11px] uppercase tracking-wider text-ink-subtle">
                Demo build · try a role
              </div>
              <div className="space-y-1">
                {DEMO_ACCOUNTS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => fill(u.email)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition cursor-pointer ${
                      email === u.email ? "bg-amber-muted" : "hover:bg-surface"
                    }`}
                  >
                    <Avatar name={u.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-ink truncate">{u.name}</span>
                      <span className="block text-[11px] text-ink-subtle truncate">{u.email}</span>
                    </span>
                    <RoleBadge role={u.role} />
                  </button>
                ))}
              </div>
              <div className="px-1 pt-2 text-[11px] text-ink-subtle">
                Tapping one fills the form. Every demo account uses the same password.
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
