/**
 * Who can sign in, what they may do, and which branches exist.
 *
 * Like the ledger, this lives in the browser until there is an accounting
 * service, and every change goes through the functions here so swapping in an
 * API touches this file and nothing above it. Until then sign-in is a demo:
 * it shapes who sees what, it does not protect the figures.
 *
 * Branches used to be a fixed list. They are data now, with one rule that
 * matters: a branch's id never changes once created, because every entry and
 * salary in the book is filed under it. Renaming changes the label only, and a
 * branch is archived rather than deleted so its months still add up.
 */

"use client";

import { Ledger, monthKey, salaryKey, workingDays, entryKey } from "./accounting";
import { MIN_PASSWORD, hashPassword, newSalt } from "./password";
import { persisted } from "./persist";
import { SEED_BRANCHES, seedUsers } from "@/data/demo";

/* ── types ─────────────────────────────────────────────────────────────── */

export type Role = "admin" | "accountant" | "viewer";

export type User = {
  id: string;
  name: string;
  /** Sign-in name. Stored lower-case. */
  email: string;
  role: Role;
  /** Switched-off accounts keep their name on entries they made. */
  active: boolean;
  salt: string;
  passwordHash: string;
  createdAt: string;
};

export type Branch = {
  /** Permanent. Entries are keyed by it. */
  id: string;
  /** In full, e.g. "Enugu Head Office". */
  name: string;
  /** On tabs and table headers, e.g. "Enugu". */
  short: string;
  /** Archived branches leave Enter day but stay in the months they have figures for. */
  active: boolean;
};

type Session = { userId: string; signedInAt: string } | null;

export type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const OK: Result = { ok: true };

/* ── roles ─────────────────────────────────────────────────────────────── */

export const ROLES: { id: Role; label: string; description: string }[] = [
  {
    id: "admin",
    label: "Admin",
    description: "Everything an accountant can do, plus staff, branches and expense lines.",
  },
  {
    id: "accountant",
    label: "Accountant",
    description: "Writes up days and salary. Reads every book.",
  },
  {
    id: "viewer",
    label: "Viewer",
    description: "Reads the books and downloads reports. Cannot change figures.",
  },
];

export const roleLabel = (role: Role) => ROLES.find((r) => r.id === role)?.label || role;

export type Permission = "edit-book" | "manage-staff" | "manage-branches" | "manage-categories";

const GRANTS: Record<Role, Permission[]> = {
  admin: ["edit-book", "manage-staff", "manage-branches", "manage-categories"],
  accountant: ["edit-book"],
  viewer: [],
};

export const can = (user: User | null | undefined, permission: Permission) =>
  !!user && user.active && GRANTS[user.role].includes(permission);

/* ── stores ────────────────────────────────────────────────────────────── */

const users = persisted<User[]>("sonichoice.accounts.users.v1", seedUsers);
const branches = persisted<Branch[]>("sonichoice.accounts.branches.v1", () => SEED_BRANCHES);
const session = persisted<Session>("sonichoice.accounts.session.v1", () => null);

export const useUsers = users.use;
export const useBranches = branches.use;

/**
 * `undefined` while the browser copy is still being read, `null` when nobody
 * is signed in — the shell waits on the first and sends the second to /login.
 * A session for an account that has since been switched off counts as signed out.
 */
export function useCurrentUser(): User | null | undefined {
  const s = session.useLoaded();
  const all = users.use();
  if (s === undefined) return undefined;
  const user = s && all.find((u) => u.id === s.userId);
  return user && user.active ? user : null;
}

function currentUser(): User | null {
  const s = session.read();
  const user = s && users.read().find((u) => u.id === s.userId);
  return user && user.active ? user : null;
}

/** For the store: checked on every write, whatever the screen allowed. */
export const currentUserCan = (permission: Permission) => can(currentUser(), permission);

/* ── signing in ────────────────────────────────────────────────────────── */

const normalEmail = (email: string) => email.trim().toLowerCase();
const looksLikeEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function signIn(email: string, password: string): Result {
  const user = users.read().find((u) => u.email === normalEmail(email));
  if (!user || user.passwordHash !== hashPassword(password, user.salt))
    return fail("That email and password don't match an account.");
  if (!user.active)
    return fail("This account has been switched off. Ask an admin to turn it back on.");
  session.write({ userId: user.id, signedInAt: new Date().toISOString() });
  return OK;
}

/* Signing out on purpose lands on a clean sign-in page; a session that simply
   ran out (another tab, a switched-off account) is sent back to where it was. */
let deliberateSignOut = false;

export function signOut() {
  deliberateSignOut = true;
  session.write(null);
}

/** True once after signOut(), so the shell knows not to remember the page. */
export function consumeDeliberateSignOut() {
  const was = deliberateSignOut;
  deliberateSignOut = false;
  return was;
}

/* ── your own account ──────────────────────────────────────────────────── */

export function updateProfile(changes: { name: string; email: string }): Result {
  const me = currentUser();
  if (!me) return fail("You are signed out.");
  const name = changes.name.trim();
  const email = normalEmail(changes.email);
  if (!name) return fail("Your name can't be empty.");
  if (!looksLikeEmail(email)) return fail("That doesn't look like an email address.");
  if (users.read().some((u) => u.id !== me.id && u.email === email))
    return fail("Another account already uses that email.");
  patchUser(me.id, { name, email });
  return OK;
}

export function changePassword(current: string, next: string): Result {
  const me = currentUser();
  if (!me) return fail("You are signed out.");
  if (me.passwordHash !== hashPassword(current, me.salt))
    return fail("Your current password isn't right.");
  if (next.length < MIN_PASSWORD)
    return fail(`The new password needs at least ${MIN_PASSWORD} characters.`);
  const salt = newSalt();
  patchUser(me.id, { salt, passwordHash: hashPassword(next, salt) });
  return OK;
}

/* ── staff (admins only) ───────────────────────────────────────────────── */

function patchUser(id: string, changes: Partial<User>) {
  users.write(users.read().map((u) => (u.id === id ? { ...u, ...changes } : u)));
}

/** The book must never be left with nobody able to manage it. */
function leavesNoAdmin(id: string, after: Partial<User>): boolean {
  const next = users.read().map((u) => (u.id === id ? { ...u, ...after } : u));
  return !next.some((u) => u.active && u.role === "admin");
}

function requireAdmin(): Result | null {
  return can(currentUser(), "manage-staff") ? null : fail("Only an admin can change staff.");
}

export function addUser(input: {
  name: string;
  email: string;
  role: Role;
  password: string;
}): Result {
  const denied = requireAdmin();
  if (denied) return denied;
  const name = input.name.trim();
  const email = normalEmail(input.email);
  if (!name) return fail("Give their full name.");
  if (!looksLikeEmail(email)) return fail("That doesn't look like an email address.");
  if (users.read().some((u) => u.email === email))
    return fail("Someone already signs in with that email.");
  if (input.password.length < MIN_PASSWORD)
    return fail(`The first password needs at least ${MIN_PASSWORD} characters.`);

  const salt = newSalt();
  users.write([
    ...users.read(),
    {
      id: `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      role: input.role,
      active: true,
      salt,
      passwordHash: hashPassword(input.password, salt),
      createdAt: new Date().toISOString(),
    },
  ]);
  return OK;
}

export function setRole(id: string, role: Role): Result {
  const denied = requireAdmin();
  if (denied) return denied;
  if (leavesNoAdmin(id, { role })) return fail("Keep at least one active admin.");
  patchUser(id, { role });
  return OK;
}

export function setUserActive(id: string, active: boolean): Result {
  const denied = requireAdmin();
  if (denied) return denied;
  if (!active && currentUser()?.id === id)
    return fail("You can't switch off your own account.");
  if (leavesNoAdmin(id, { active })) return fail("Keep at least one active admin.");
  patchUser(id, { active });
  return OK;
}

export function resetPassword(id: string, password: string): Result {
  const denied = requireAdmin();
  if (denied) return denied;
  if (password.length < MIN_PASSWORD)
    return fail(`The new password needs at least ${MIN_PASSWORD} characters.`);
  const salt = newSalt();
  patchUser(id, { salt, passwordHash: hashPassword(password, salt) });
  return OK;
}

/* ── branches (admins only) ────────────────────────────────────────────── */

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "branch";

export function addBranch(input: { name: string; short: string }): Result {
  if (!can(currentUser(), "manage-branches")) return fail("Only an admin can add branches.");
  const name = input.name.trim();
  const short = input.short.trim() || name;
  if (!name) return fail("Give the branch a name.");
  const all = branches.read();
  if (all.some((b) => b.name.toLowerCase() === name.toLowerCase()))
    return fail("There is already a branch by that name.");

  let id = slug(short);
  for (let n = 2; all.some((b) => b.id === id); n++) id = `${slug(short)}-${n}`;
  branches.write([...all, { id, name, short, active: true }]);
  return OK;
}

export function renameBranch(id: string, input: { name: string; short: string }): Result {
  if (!can(currentUser(), "manage-branches")) return fail("Only an admin can rename branches.");
  const name = input.name.trim();
  const short = input.short.trim();
  if (!name || !short) return fail("Both names are needed.");
  if (branches.read().some((b) => b.id !== id && b.name.toLowerCase() === name.toLowerCase()))
    return fail("There is already a branch by that name.");
  branches.write(branches.read().map((b) => (b.id === id ? { ...b, name, short } : b)));
  return OK;
}

export function setBranchActive(id: string, active: boolean): Result {
  if (!can(currentUser(), "manage-branches")) return fail("Only an admin can archive branches.");
  const next = branches.read().map((b) => (b.id === id ? { ...b, active } : b));
  if (!next.some((b) => b.active)) return fail("At least one branch has to stay open.");
  branches.write(next);
  return OK;
}

/* ── branches in the books ─────────────────────────────────────────────── */

/** Whether a branch has anything written against it in a month. */
export function hasFigures(ledger: Ledger, branchId: string, year: number, month: number) {
  return (
    !!ledger.salaries[salaryKey(monthKey(year, month), branchId)] ||
    workingDays(year, month).some((d) => ledger.entries[entryKey(branchId, d)])
  );
}

/**
 * The branches a month's books should show: every open branch, plus any
 * archived one that has figures that month — so archiving a branch never
 * makes an old month's totals change.
 */
export function branchesForMonth(
  all: Branch[],
  ledger: Ledger,
  year: number,
  month: number
): Branch[] {
  return all.filter((b) => b.active || hasFigures(ledger, b.id, year, month));
}

export const branchShort = (all: Branch[], id: string) =>
  all.find((b) => b.id === id)?.short || id;

/** Clears staff, branches and the session back to the demo seed. */
export function resetDirectory() {
  users.write(seedUsers());
  branches.write(SEED_BRANCHES);
  session.write(null);
}
