/**
 * Demo data for the accounting iteration.
 *
 * Nothing here talks to the API — the accounting endpoints do not exist yet,
 * and the point of this build is to put something in front of the accounting
 * team and let them say what is wrong with it. The figures are generated from
 * a fixed seed, so the same screen comes up every time it is demonstrated.
 */

import {
  DEFAULT_CATEGORIES,
  Entry,
  Ledger,
  dateKey,
  entryKey,
  isSunday,
  monthKey,
  salaryKey,
} from "@/lib/accounting";
import type { Branch, Role, User } from "@/lib/directory";
import { hashPassword } from "@/lib/password";

/**
 * The branches a fresh install starts with — the same three the inventory
 * system runs on. After that they live in the directory store and are managed
 * on the Branches screen; read them with useBranches(), not from here.
 */
export const SEED_BRANCHES: Branch[] = [
  { id: "enugu", name: "Enugu Head Office", short: "Enugu", active: true },
  { id: "nsukka", name: "Nsukka Branch", short: "Nsukka", active: true },
  { id: "ebonyi", name: "Ebonyi Branch", short: "Ebonyi", active: true },
];

/**
 * One account per role, so the demo can show what each one sees. The shared
 * password is printed on the sign-in screen while this is a demo build.
 */
export const DEMO_PASSWORD = "sonichoice123";

export function seedUsers(): User[] {
  const people: [string, string, string, Role][] = [
    ["u-admin", "Chinedu Okafor", "admin@sonichoicelogistics.com", "admin"],
    ["u-accounts", "Amaka Eze", "accounts@sonichoicelogistics.com", "accountant"],
    ["u-viewer", "Ifeanyi Nnaji", "manager@sonichoicelogistics.com", "viewer"],
  ];
  return people.map(([id, name, email, role]) => {
    const salt = `seed-${id}`;
    return {
      id,
      name,
      email,
      role,
      active: true,
      salt,
      passwordHash: hashPassword(DEMO_PASSWORD, salt),
      createdAt: "2026-11-01T09:00:00",
    };
  });
}

/** The month the sample book covers. */
export const DEMO_YEAR = 2026;
export const DEMO_MONTH = 10; // November

/** Small deterministic generator, so a demo never shifts under anyone. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Roughly how often a line is filled, and what it tends to cost. */
const SHAPE: Record<string, { chance: number; low: number; high: number }> = {
  "merchant-waybill": { chance: 0.7, low: 2000, high: 18000 },
  "internal-waybill": { chance: 0.45, low: 1500, high: 9000 },
  "staff-airtime": { chance: 0.8, low: 500, high: 2500 },
  fuel: { chance: 0.85, low: 3000, high: 12000 },
  "transport-deliveries": { chance: 0.9, low: 2000, high: 15000 },
  stationaries: { chance: 0.2, low: 500, high: 4000 },
  "gate-pass": { chance: 0.5, low: 200, high: 1500 },
  "bike-maintenance": { chance: 0.3, low: 1500, high: 14000 },
  "pos-charge": { chance: 0.75, low: 100, high: 1200 },
  nepa: { chance: 0.25, low: 1000, high: 9000 },
  "staff-welfare": { chance: 0.35, low: 1000, high: 6000 },
  "tips-phone": { chance: 0.3, low: 200, high: 1000 },
  mechanic: { chance: 0.12, low: 3000, high: 25000 },
  others: { chance: 0.15, low: 500, high: 7000 },
  loan: { chance: 0.08, low: 5000, high: 40000 },
  withdrawals: { chance: 0.12, low: 10000, high: 60000 },
};

const OTHERS_NOTES = [
  "Market union levy",
  "Replacement padlock for store",
  "Dispatch rider feeding",
  "Photocopy of waybills",
];

/** Head office moves more money than the smaller branches. */
const SCALE: Record<string, number> = { enugu: 1, nsukka: 0.6, ebonyi: 0.45 };

function makeEntry(branchId: string, date: string): Entry {
  const rand = seeded(`${branchId}:${date}`);
  const scale = SCALE[branchId] ?? 0.6;
  const amounts: Record<string, number> = {};
  const notes: Record<string, string> = {};

  for (const c of DEFAULT_CATEGORIES) {
    const shape = SHAPE[c.id];
    if (!shape || rand() > shape.chance) continue;
    const raw = (shape.low + rand() * (shape.high - shape.low)) * scale;
    amounts[c.id] = Math.round(raw / 100) * 100;
    if (c.id === "others")
      notes[c.id] = OTHERS_NOTES[Math.floor(rand() * OTHERS_NOTES.length)];
  }

  return {
    branchId,
    date,
    revenue: Math.round(((60_000 + rand() * 220_000) * scale) / 500) * 500,
    amounts,
    notes,
    recordedBy: "Amaka Eze",
    recordedAt: `${date}T18:30:00`,
  };
}

/**
 * November 2026 filled in up to the 21st, which is what a part-written book
 * looks like — and lets the "not recorded" gaps show up in the day book.
 */
export function seedLedger(): Ledger {
  const entries: Record<string, Entry> = {};
  const salaries: Record<string, number> = {};
  const month = monthKey(DEMO_YEAR, DEMO_MONTH);

  for (const branch of SEED_BRANCHES) {
    for (let day = 1; day <= 21; day++) {
      const date = dateKey(DEMO_YEAR, DEMO_MONTH, day);
      if (isSunday(date)) continue;
      entries[entryKey(branch.id, date)] = makeEntry(branch.id, date);
    }
    salaries[salaryKey(month, branch.id)] = Math.round(
      450_000 * (SCALE[branch.id] ?? 0.6)
    );
  }

  return { categories: DEFAULT_CATEGORIES, entries, salaries };
}
