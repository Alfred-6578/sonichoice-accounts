"use client";

/**
 * Who can sign in and what each person may do. Admins only.
 *
 * Nobody is deleted: a person who leaves is switched off, so the days they
 * wrote up still carry their name. The last active admin cannot be demoted or
 * switched off, or the book would be left with nobody able to manage it.
 */

import { useState } from "react";
import { ChevronDown, KeyRound, Power, Sparkles, UserPlus } from "lucide-react";
import {
  ROLES,
  Role,
  User,
  addUser,
  resetPassword,
  setRole,
  setUserActive,
  useCurrentUser,
  useUsers,
} from "@/lib/directory";
import { MIN_PASSWORD } from "@/lib/password";
import {
  Avatar,
  CARD,
  DANGER,
  Field,
  FormMessage,
  INPUT,
  LABEL,
  PRIMARY,
  PageTitle,
  RoleBadge,
  SECONDARY,
  mono,
  syne,
} from "@/components/shared";

type Message = { error?: string; success?: string };

/** Easy to read out over the phone, long enough to pass. */
function suggestPassword() {
  const words = ["Mango", "Kolanut", "Harmattan", "Udala", "Okpa", "Ugba", "Oha", "Ofe"];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/** Three roles side by side, each saying what it allows. */
function RolePicker({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  return (
    <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
      {ROLES.map((r) => {
        const on = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(r.id)}
            className={`flex flex-col justify-start text-left p-3 rounded-lg border transition cursor-pointer ${
              on
                ? "border-amber bg-amber-muted ring-2 ring-amber-border"
                : "border-border bg-surface-raised hover:border-border-strong"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  on ? "border-amber" : "border-border-strong"
                }`}
              >
                {on && <span className="w-2 h-2 rounded-full bg-amber" />}
              </span>
              <span className={`${syne.className} text-sm font-bold text-ink`}>{r.label}</span>
            </span>
            <span className="block text-[12px] text-ink-muted mt-1 leading-snug">
              {r.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRoleValue] = useState<Role>("accountant");
  const [password, setPassword] = useState(suggestPassword);
  const [message, setMessage] = useState<Message>({});

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addUser({ name, email, role, password });
    if (result.ok) onDone();
    else setMessage({ error: result.error });
  };

  return (
    <form onSubmit={save} className={`${CARD} p-5 mb-4 border-amber-border`}>
      <h2 className={`${syne.className} text-base font-bold text-ink`}>Add a staff member</h2>
      <p className="text-[13px] text-ink-muted mt-0.5 mb-5">
        They sign in with this email and the first password below, then change it from
        their profile.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ngozi Okeke"
            className={INPUT}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            placeholder="name@sonichoicelogistics.com"
            className={INPUT}
          />
        </Field>
      </div>

      <div className="mt-5">
        <div className="text-[13px] font-medium text-ink-secondary mb-1.5">Role</div>
        <RolePicker value={role} onChange={setRoleValue} />
      </div>

      <div className="mt-5 max-w-md">
        <Field
          label="First password"
          hint={`At least ${MIN_PASSWORD} characters. Tell them in person or by phone.`}
        >
          <div className="flex gap-2">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={`${INPUT} ${mono.className}`}
            />
            <button
              type="button"
              onClick={() => setPassword(suggestPassword())}
              className={`${SECONDARY} shrink-0`}
              title="Suggest another"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden tny:inline">Suggest</span>
            </button>
          </div>
        </Field>
      </div>

      <div className="mt-5 flex flex-col-reverse tny:flex-row tny:items-center gap-3">
        <div className="flex-1">
          <FormMessage {...message} />
        </div>
        <button type="button" onClick={onDone} className={SECONDARY}>
          Cancel
        </button>
        <button type="submit" className={PRIMARY}>
          <UserPlus className="w-4 h-4" />
          Add staff member
        </button>
      </div>
    </form>
  );
}

/** One person, with their controls folded away until asked for. */
function StaffRow({ person, isMe }: { person: User; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<Message>({});

  const report = (result: { ok: boolean; error?: string }, success: string) =>
    setMessage(result.ok ? { success } : { error: result.error });

  return (
    <div className={person.active ? "" : "bg-surface/60"}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          setMessage({});
        }}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface transition cursor-pointer"
      >
        <span className={person.active ? "" : "opacity-50 grayscale"}>
          <Avatar name={person.name} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={`text-sm font-medium truncate ${person.active ? "text-ink" : "text-ink-muted"}`}
            >
              {person.name}
            </span>
            {isMe && (
              <span className="text-[10px] uppercase tracking-wider text-ink-subtle">You</span>
            )}
          </span>
          <span className="block text-[12px] text-ink-subtle truncate">{person.email}</span>
        </span>
        <span className="hidden tny:flex items-center gap-2 shrink-0">
          {!person.active && (
            <span className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-surface text-ink-muted">
              Switched off
            </span>
          )}
          <RoleBadge role={person.role} />
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-subtle shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-5 pt-1 tny:pl-17 space-y-5">
          {/* Phones show the role here, since the row is too narrow for it. */}
          <div className="tny:hidden flex items-center gap-2">
            <RoleBadge role={person.role} />
            {!person.active && <span className="text-[12px] text-ink-muted">Switched off</span>}
          </div>

          <div>
            <div className={`${LABEL} mb-2`}>Role</div>
            <RolePicker
              value={person.role}
              onChange={(role) => report(setRole(person.id, role), "Role changed.")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <Field label="Set a new password" hint="For when they have forgotten theirs.">
              <div className="flex gap-2">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`At least ${MIN_PASSWORD} characters`}
                  autoComplete="off"
                  spellCheck={false}
                  className={`${INPUT} ${mono.className}`}
                />
                <button
                  type="button"
                  disabled={!newPassword}
                  onClick={() => {
                    const result = resetPassword(person.id, newPassword);
                    report(result, `New password set. Give it to ${person.name.split(" ")[0]}.`);
                    if (result.ok) setNewPassword("");
                  }}
                  className={`${SECONDARY} shrink-0`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span className="hidden tny:inline">Set</span>
                </button>
              </div>
            </Field>

            {!isMe && (
              <button
                type="button"
                onClick={() =>
                  report(
                    setUserActive(person.id, !person.active),
                    person.active ? "Switched off. They can no longer sign in." : "Turned back on."
                  )
                }
                className={person.active ? DANGER : SECONDARY}
              >
                <Power className="w-4 h-4" />
                {person.active ? "Switch off account" : "Turn back on"}
              </button>
            )}
          </div>

          <FormMessage {...message} />
        </div>
      )}
    </div>
  );
}

export default function Staff() {
  const people = useUsers();
  const me = useCurrentUser();
  const [adding, setAdding] = useState(false);

  /* Active first, then by role, then by name — the list reads top-down. */
  const order: Role[] = ["admin", "accountant", "viewer"];
  const sorted = [...people].sort(
    (a, b) =>
      Number(b.active) - Number(a.active) ||
      order.indexOf(a.role) - order.indexOf(b.role) ||
      a.name.localeCompare(b.name)
  );

  return (
    <div>
      <PageTitle title="Staff" subtitle="Who can sign in, and what each person can do">
        {!adding && (
          <button onClick={() => setAdding(true)} className={PRIMARY}>
            <UserPlus className="w-4 h-4" />
            Add staff member
          </button>
        )}
      </PageTitle>

      {adding && <AddForm onDone={() => setAdding(false)} />}

      {/* HOW MANY OF EACH */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {ROLES.map((r) => {
          const count = people.filter((p) => p.active && p.role === r.id).length;
          return (
            <div key={r.id} className={`${CARD} p-4`}>
              <div className={LABEL}>{r.label}s</div>
              <div className={`${mono.className} text-2xl text-ink mt-0.5`}>{count}</div>
              <div className="hidden sm:block text-[12px] text-ink-subtle mt-1 leading-snug">
                {r.description}
              </div>
            </div>
          );
        })}
      </div>

      <div className={CARD}>
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className={`${syne.className} text-sm font-bold text-ink`}>Everyone</div>
          <span className={LABEL}>
            {people.filter((p) => p.active).length} active · {people.length} total
          </span>
        </div>
        <div className="divide-y divide-border">
          {sorted.map((p) => (
            <StaffRow key={p.id} person={p} isMe={p.id === me?.id} />
          ))}
        </div>
      </div>

      <p className="mt-4 text-[12px] text-ink-subtle">
        People are switched off rather than removed, so the days they wrote up keep their
        name.
      </p>
    </div>
  );
}
