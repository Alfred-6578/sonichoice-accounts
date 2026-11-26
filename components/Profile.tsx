"use client";

/**
 * Your own account: who the book says you are, your password, signing out.
 * Role is shown, not chosen — only an admin changes it, from Staff.
 */

import { useState } from "react";
import { Check, LogOut, X } from "lucide-react";
import { MIN_PASSWORD } from "@/lib/password";
import {
  Permission,
  ROLES,
  User,
  can,
  changePassword,
  signOut,
  updateProfile,
} from "@/lib/directory";
import { useLedger } from "@/lib/store";
import {
  Avatar,
  CARD,
  Field,
  FormMessage,
  INPUT,
  PRIMARY,
  PageTitle,
  RoleBadge,
  SECONDARY,
  mono,
  syne,
} from "@/components/shared";

/** What each permission means to the person holding it. */
const ABILITIES: { permission: Permission | null; text: string }[] = [
  { permission: null, text: "Read the day book, monthly sheet and reports" },
  { permission: "edit-book", text: "Write up days and enter salary while a month is open" },
  { permission: "manage-staff", text: "Add staff, set roles and reset passwords" },
  { permission: "manage-branches", text: "Add, rename and archive branches" },
  { permission: "manage-categories", text: "Add, rename, reorder and archive expense lines" },
];

const since = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { month: "long", year: "numeric" });

function Details({ user }: { user: User }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const changed = name.trim() !== user.name || email.trim().toLowerCase() !== user.email;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const result = updateProfile({ name, email });
    setMessage(result.ok ? { success: "Saved." } : { error: result.error });
  };

  return (
    <form onSubmit={save} className={`${CARD} p-5`}>
      <h2 className={`${syne.className} text-base font-bold text-ink`}>Your details</h2>
      <p className="text-[13px] text-ink-muted mt-0.5 mb-5">
        Your name goes on every day you write up.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setMessage({});
            }}
            autoComplete="name"
            className={INPUT}
          />
        </Field>
        <Field label="Email" hint="What you sign in with.">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setMessage({});
            }}
            autoComplete="email"
            autoCapitalize="none"
            className={INPUT}
          />
        </Field>
      </div>
      <div className="mt-5 flex flex-col-reverse tny:flex-row tny:items-center gap-3">
        <div className="flex-1">
          <FormMessage {...message} />
        </div>
        <button type="submit" disabled={!changed} className={PRIMARY}>
          Save details
        </button>
      </div>
    </form>
  );
}

function Password() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== again) {
      setMessage({ error: "The two new passwords don't match." });
      return;
    }
    const result = changePassword(current, next);
    if (result.ok) {
      setCurrent("");
      setNext("");
      setAgain("");
      setMessage({ success: "Password changed. Use the new one next time you sign in." });
    } else setMessage({ error: result.error });
  };

  const clear = () => setMessage({});

  return (
    <form onSubmit={save} className={`${CARD} p-5`}>
      <h2 className={`${syne.className} text-base font-bold text-ink`}>Password</h2>
      <p className="text-[13px] text-ink-muted mt-0.5 mb-5">
        At least {MIN_PASSWORD} characters. Nobody else can see it — an admin can only
        replace it.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              clear();
            }}
            className={INPUT}
          />
        </Field>
        <Field label="New password">
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              clear();
            }}
            className={INPUT}
          />
        </Field>
        <Field label="New password again">
          <input
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(e) => {
              setAgain(e.target.value);
              clear();
            }}
            className={INPUT}
          />
        </Field>
      </div>
      <div className="mt-5 flex flex-col-reverse tny:flex-row tny:items-center gap-3">
        <div className="flex-1">
          <FormMessage {...message} />
        </div>
        <button type="submit" disabled={!current || !next || !again} className={PRIMARY}>
          Change password
        </button>
      </div>
    </form>
  );
}

export default function Profile({ user }: { user: User }) {
  const ledger = useLedger();
  const written = Object.values(ledger.entries).filter((e) => e.recordedBy === user.name).length;
  const role = ROLES.find((r) => r.id === user.role);

  return (
    <div>
      <PageTitle title="Profile" subtitle="Your account and how you sign in" />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        <div className="space-y-4 min-w-0">
          {/* WHO YOU ARE */}
          <div className={`${CARD} p-5 flex flex-col tny:flex-row tny:items-center gap-4`}>
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0 flex-1">
              <div className={`${syne.className} text-xl font-bold text-ink truncate`}>
                {user.name}
              </div>
              <div className="text-sm text-ink-muted truncate">{user.email}</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-ink-subtle">
                <RoleBadge role={user.role} />
                <span>Member since {since(user.createdAt)}</span>
              </div>
            </div>
            <div className="tny:text-right">
              <div className={`${mono.className} text-2xl text-ink`}>{written}</div>
              <div className="text-[11px] uppercase tracking-wider text-ink-subtle">
                Days written up
              </div>
            </div>
          </div>

          <Details key={`${user.id}|${user.name}|${user.email}`} user={user} />
          <Password />
        </div>

        {/* WHAT YOUR ROLE ALLOWS */}
        <div className="space-y-4">
          <div className={`${CARD} p-5`}>
            <div className="flex items-center justify-between">
              <h2 className={`${syne.className} text-base font-bold text-ink`}>Your role</h2>
              <RoleBadge role={user.role} />
            </div>
            <p className="text-[13px] text-ink-muted mt-1">{role?.description}</p>
            <ul className="mt-4 space-y-2.5">
              {ABILITIES.map(({ permission, text }) => {
                const yes = permission === null || can(user, permission);
                return (
                  <li key={text} className="flex gap-2.5 text-[13px]">
                    <span
                      className={`mt-0.5 w-4.5 h-4.5 shrink-0 rounded-full flex items-center justify-center ${
                        yes ? "bg-delivered-bg text-delivered" : "bg-surface text-ink-subtle"
                      }`}
                    >
                      {yes ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </span>
                    <span className={yes ? "text-ink-secondary" : "text-ink-subtle"}>{text}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 pt-4 border-t border-border text-[12px] text-ink-subtle">
              Need more access? Ask an admin to change your role.
            </p>
          </div>

          <button onClick={signOut} className={`${SECONDARY} w-full`}>
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
