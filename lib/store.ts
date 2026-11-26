/**
 * Where the accounting book lives while it is still a mock-up.
 *
 * The browser, via localStorage — so an accounting clerk can be handed the
 * screen, type a real day into it and come back to find it there, without a
 * backend existing yet. Every write goes through here, which is also the shape
 * the real API calls will take when there is one to call.
 */

"use client";

import { useSyncExternalStore } from "react";
import {
  Category,
  CategoryKind,
  DEFAULT_CATEGORIES,
  Entry,
  Ledger,
  dateKey,
  emptyLedger,
  entryKey,
  isLocked,
  salaryKey,
} from "./accounting";
import { Result, currentUserCan } from "./directory";
import { seedLedger } from "@/data/demo";

const KEY = "sonichoice.accounting.v1";

let cache: Ledger | null = null;
const listeners = new Set<() => void>();

function read(): Ledger {
  if (cache) return cache;
  if (typeof window === "undefined") return emptyLedger();
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Ledger>) : null;
    /* Books saved before the category list became editable have no list of
       their own; they get the original sixteen, which is what they used. */
    cache = parsed
      ? {
          categories: parsed.categories || DEFAULT_CATEGORIES,
          entries: parsed.entries || {},
          salaries: parsed.salaries || {},
        }
      : seedLedger();
  } catch {
    cache = seedLedger();
  }
  return cache;
}

function write(next: Ledger) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or blocked store must not take the screen down with it.
  }
  listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const SERVER_SNAPSHOT = emptyLedger();

export function useLedger(): Ledger {
  return useSyncExternalStore(subscribe, read, () => SERVER_SNAPSHOT);
}

export function getEntry(branchId: string, date: string): Entry | undefined {
  return read().entries[entryKey(branchId, date)];
}

/**
 * Writes refuse a closed month or a read-only account. The screens already
 * stop both; this is the backstop, and where the backend's checks will sit.
 * Returns whether anything was saved.
 */
export function saveEntry(entry: Entry): boolean {
  if (isLocked(entry.date) || !currentUserCan("edit-book")) return false;
  const current = read();
  write({
    ...current,
    entries: {
      ...current.entries,
      [entryKey(entry.branchId, entry.date)]: {
        ...entry,
        recordedAt: new Date().toISOString(),
      },
    },
  });
  return true;
}

/** `month` is YYYY-MM. Same refusals as saveEntry. */
export function saveSalary(month: string, branchId: string, amount: number): boolean {
  const [y, m] = month.split("-").map(Number);
  if (isLocked(dateKey(y, m - 1, 1)) || !currentUserCan("edit-book")) return false;
  const current = read();
  write({
    ...current,
    salaries: { ...current.salaries, [salaryKey(month, branchId)]: amount },
  });
  return true;
}

/* ── the chart of accounts (admins only) ─────────────────────────────── */

const fail = (error: string): Result => ({ ok: false, error });
const OK: Result = { ok: true };

function writeCategories(categories: Category[]) {
  const current = read();
  write({ ...current, categories });
}

const sameLabel = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export type CategoryInput = {
  label: string;
  hint?: string;
  reconcilesWith?: string;
  requiresNote?: boolean;
};

function clean(input: CategoryInput) {
  return {
    label: input.label.trim(),
    hint: input.hint?.trim() || undefined,
    reconcilesWith: input.reconcilesWith?.trim() || undefined,
    requiresNote: input.requiresNote || undefined,
  };
}

/** New lines go at the foot of their own group, so cash movements stay last. */
export function addCategory(input: CategoryInput & { kind: CategoryKind }): Result {
  if (!currentUserCan("manage-categories")) return fail("Only an admin can add lines.");
  const fields = clean(input);
  if (!fields.label) return fail("Give the line a name.");
  const all = read().categories;
  if (all.some((c) => sameLabel(c.label, fields.label)))
    return fail("There is already a line by that name.");

  const base =
    fields.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "line";
  let id = base;
  for (let n = 2; all.some((c) => c.id === id); n++) id = `${base}-${n}`;

  const lastOfKind = all.map((c) => c.kind).lastIndexOf(input.kind);
  const at = lastOfKind === -1 ? (input.kind === "expense" ? 0 : all.length) : lastOfKind + 1;
  const next = [...all];
  next.splice(at, 0, { id, kind: input.kind, ...fields });
  writeCategories(next);
  return OK;
}

/** Relabels the line everywhere, closed months included — the figures do not move. */
export function updateCategory(id: string, input: CategoryInput): Result {
  if (!currentUserCan("manage-categories")) return fail("Only an admin can change lines.");
  const fields = clean(input);
  if (!fields.label) return fail("The line needs a name.");
  const all = read().categories;
  if (all.some((c) => c.id !== id && sameLabel(c.label, fields.label)))
    return fail("There is already a line by that name.");
  writeCategories(all.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  return OK;
}

/** One place up or down, within its own group. */
export function moveCategory(id: string, by: -1 | 1): Result {
  if (!currentUserCan("manage-categories")) return fail("Only an admin can reorder lines.");
  const all = [...read().categories];
  const i = all.findIndex((c) => c.id === id);
  if (i === -1) return fail("That line no longer exists.");
  let j = i + by;
  while (j >= 0 && j < all.length && all[j].kind !== all[i].kind) j += by;
  if (j < 0 || j >= all.length) return OK;
  [all[i], all[j]] = [all[j], all[i]];
  writeCategories(all);
  return OK;
}

export function setCategoryArchived(id: string, archived: boolean): Result {
  if (!currentUserCan("manage-categories")) return fail("Only an admin can archive lines.");
  const next = read().categories.map((c) => (c.id === id ? { ...c, archived } : c));
  if (!next.some((c) => c.kind === "expense" && !c.archived))
    return fail("Keep at least one expense line open.");
  writeCategories(next);
  return OK;
}

/** Back to the sample November, for demonstrating twice in a row. */
export function resetLedger() {
  write(seedLedger());
}
