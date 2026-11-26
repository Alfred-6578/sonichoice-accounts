/**
 * The accounting book, as a data model.
 *
 * The paper process is three sheets, but there is only ever one input: an
 * amount against (branch, date, category), plus the day's revenue. The daily
 * expense sheet, the revenue ledger and the per-branch monthly sheet are all
 * sums of that, so nothing here is ever typed twice.
 *
 * Two things the paper does that software should not copy blindly, and which
 * this file keeps separable rather than deciding for anyone:
 *
 *   - Loan and Withdrawals sit in the expense grid but are cash movements, not
 *     money the business consumed. They are tagged 'cash-movement' so a report
 *     can show the paper total AND the true operating spend.
 *   - Salary is monthly and set centrally, so it lives outside the daily grid.
 *
 * The category list itself is data, kept on the Ledger beside the entries —
 * it is the book's chart of accounts and admins can add, rename, reorder and
 * archive lines. Two things about a line never change once it exists: its
 * `id` (entries are keyed by it) and its `kind` (switching a line between
 * spend and cash movement would quietly rewrite every past month's running
 * costs). A line is archived, never deleted, so old months still add up.
 *
 * Pure: no I/O, no React. The store is lib/store.ts.
 */

export type CategoryKind = "expense" | "cash-movement";

export type Category = {
  id: string;
  /** Exactly as it reads on the paper form. */
  label: string;
  kind: CategoryKind;
  /** One line of plain English under the label on the entry screen. */
  hint?: string;
  /** An outside statement this figure can be checked against. */
  reconcilesWith?: string;
  /** Catch-all lines are useless in six months without a note. */
  requiresNote?: boolean;
  /** Off Enter day for new figures; still shown wherever it has figures. */
  archived?: boolean;
};

/**
 * The lines a new book starts with, in the order they appear across the paper
 * form so the two can be read side by side. After that the list lives on the
 * Ledger — read `ledger.categories`, not this.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "merchant-waybill", label: "Merchant's waybill", kind: "expense", hint: "Waybill paid on a merchant's goods" },
  { id: "internal-waybill", label: "Internal branch waybill", kind: "expense", hint: "Waybill between our own branches" },
  { id: "staff-airtime", label: "Staff airtime", kind: "expense" },
  { id: "fuel", label: "Fuel", kind: "expense" },
  { id: "transport-deliveries", label: "Transport for deliveries", kind: "expense", hint: "TP for deliveries" },
  { id: "stationaries", label: "Stationaries", kind: "expense" },
  { id: "gate-pass", label: "Gate pass", kind: "expense" },
  { id: "bike-maintenance", label: "Bike maintenance", kind: "expense" },
  { id: "pos-charge", label: "POS charge", kind: "expense", reconcilesWith: "Moniepoint statement" },
  { id: "nepa", label: "NEPA / maintenance", kind: "expense", hint: "Electricity and general upkeep" },
  { id: "staff-welfare", label: "Staff welfare support", kind: "expense" },
  { id: "tips-phone", label: "Tips for phone", kind: "expense" },
  { id: "mechanic", label: "Mechanic", kind: "expense" },
  { id: "others", label: "Others", kind: "expense", requiresNote: true, hint: "Say what it was" },
  { id: "loan", label: "Loan", kind: "cash-movement", hint: "Money lent out, not spent" },
  { id: "withdrawals", label: "Withdrawals", kind: "cash-movement", hint: "Cash taken out, not spent" },
];

export const expenseLines = (categories: Category[]) =>
  categories.filter((c) => c.kind === "expense");
export const cashMovementLines = (categories: Category[]) =>
  categories.filter((c) => c.kind === "cash-movement");

/** One branch, one day. The only thing anybody types. */
export type Entry = {
  branchId: string;
  /** YYYY-MM-DD */
  date: string;
  /** Cash received from deliveries that day. */
  revenue: number;
  /** categoryId -> amount. Absent or 0 means the cell was left blank. */
  amounts: Record<string, number>;
  /** categoryId -> what it was. Required for "Others". */
  notes?: Record<string, string>;
  recordedBy?: string;
  recordedAt?: string;
};

export type Ledger = {
  /** The chart of accounts, in display order. Includes archived lines. */
  categories: Category[];
  /** Keyed `${branchId}|${date}` so a day can only be recorded once. */
  entries: Record<string, Entry>;
  /** `${monthKey}|${branchId}` -> salary paid that month. */
  salaries: Record<string, number>;
};

export const emptyLedger = (): Ledger => ({
  categories: DEFAULT_CATEGORIES,
  entries: {},
  salaries: {},
});

export const entryKey = (branchId: string, date: string) => `${branchId}|${date}`;
export const salaryKey = (month: string, branchId: string) => `${month}|${branchId}`;

/* ── dates ──────────────────────────────────────────────────────────────── */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** YYYY-MM */
export const monthKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

/** YYYY-MM-DD, from local parts — never via toISOString, which shifts the day. */
export const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const todayKey = () => {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
};

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The paper's own weekday letters: M T W TH F S. Sunday is never written. */
const WEEKDAY = ["S", "M", "T", "W", "TH", "F", "S"];
export const weekdayLetter = (key: string) => WEEKDAY[parseDateKey(key).getDay()];

export const isSunday = (key: string) => parseDateKey(key).getDay() === 0;

/** Date of the first Saturday in a month, where each week block ends. */
function firstSaturday(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay(); // 0 = Sunday
  return 1 + ((6 - day + 7) % 7);
}

/**
 * Which of the month's week blocks a date falls in. The book runs Monday to
 * Saturday, so a block closes on a Saturday and the first block is however
 * much of a week the month opens with.
 *
 * November 2026 lands as 2-7, 9-14, 16-21, 23-28, 30 — the same five blocks as
 * the paper. A month opening mid-week, like December 2026, keeps its short
 * first block (1-5) rather than swallowing eleven days into week 1.
 */
export function weekOfMonth(key: string): number {
  const d = parseDateKey(key);
  const end = firstSaturday(d.getFullYear(), d.getMonth());
  if (d.getDate() <= end) return 1;
  return Math.floor((d.getDate() - end - 1) / 7) + 2;
}

/** Counted off the last working day, so a month ending on a Sunday does not
 *  leave an empty week column on the monthly sheet. */
export function weeksInMonth(year: number, month: number): number {
  const days = workingDays(year, month);
  return weekOfMonth(days[days.length - 1]);
}

/** Every working day of a month, Sundays left out, in order. */
export function workingDays(year: number, month: number): string[] {
  const last = new Date(year, month + 1, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= last; d++) {
    const key = dateKey(year, month, d);
    if (!isSunday(key)) out.push(key);
  }
  return out;
}

/* ── when a month closes ────────────────────────────────────────────────── */

/**
 * How long after a month ends its book can still be corrected.
 *
 * Receipts and branch reports trickle in after the month turns, so the book
 * stays open for a week past the last day. After that the figures have been
 * read and acted on, and changing them quietly would make the month say
 * something different from what management was told — so it is closed to
 * everybody, admins included. November 2026 is editable through 7 December
 * and closed from 8 December.
 */
export const EDIT_GRACE_DAYS = 7;

/** The last day a date's month can still be edited, as YYYY-MM-DD. */
export function editDeadline(date: string): string {
  const d = parseDateKey(date);
  // Day 0 of the next month is the last day of this one.
  const end = new Date(d.getFullYear(), d.getMonth() + 1, EDIT_GRACE_DAYS);
  return dateKey(end.getFullYear(), end.getMonth(), end.getDate());
}

/** True once a date's month is past its edit deadline. Keys compare as text. */
export const isLocked = (date: string, today: string = todayKey()) =>
  today > editDeadline(date);

/* ── totals ─────────────────────────────────────────────────────────────── */

const sumKind = (entry: Entry | undefined, categories: Category[], kind: CategoryKind) =>
  entry
    ? categories
        .filter((c) => c.kind === kind)
        .reduce((sum, c) => sum + (entry.amounts[c.id] || 0), 0)
    : 0;

/** Money the business actually consumed. Archived lines still count. */
export const operatingTotal = (entry: Entry | undefined, categories: Category[]) =>
  sumKind(entry, categories, "expense");

/** Loan and withdrawals — cash that left the drawer but was not spent. */
export const cashMovementTotal = (entry: Entry | undefined, categories: Category[]) =>
  sumKind(entry, categories, "cash-movement");

/** "Total for the day" as the paper computes it: every line added together.
 *  Needs no category list — every amount is on some line, whatever its kind. */
export const dayTotal = (entry?: Entry) =>
  entry ? Object.values(entry.amounts).reduce((sum, v) => sum + (v || 0), 0) : 0;

/** Revenue less the day's total, matching the Balance column in the book. */
export const balanceOf = (entry?: Entry) => (entry?.revenue || 0) - dayTotal(entry);

/** True for an entry that has been opened but has nothing in it. */
export const isBlank = (entry?: Entry) =>
  !entry || (entry.revenue === 0 && dayTotal(entry) === 0);

/* ── views over the ledger ──────────────────────────────────────────────── */

export type DayRow = {
  date: string;
  weekday: string;
  week: number;
  entry?: Entry;
};

/** Sheet 2 for one branch: every working day of the month, recorded or not. */
export function daybook(
  ledger: Ledger,
  branchId: string,
  year: number,
  month: number
): DayRow[] {
  return workingDays(year, month).map((date) => ({
    date,
    weekday: weekdayLetter(date),
    week: weekOfMonth(date),
    entry: ledger.entries[entryKey(branchId, date)],
  }));
}

export type WeekBlock = {
  week: number;
  rows: DayRow[];
  revenue: number;
  expenses: number;
  balance: number;
};

export function groupByWeek(rows: DayRow[]): WeekBlock[] {
  const blocks = new Map<number, DayRow[]>();
  for (const row of rows) {
    const list = blocks.get(row.week) || [];
    list.push(row);
    blocks.set(row.week, list);
  }
  return [...blocks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, list]) => ({
      week,
      rows: list,
      revenue: list.reduce((s, r) => s + (r.entry?.revenue || 0), 0),
      expenses: list.reduce((s, r) => s + dayTotal(r.entry), 0),
      balance: list.reduce((s, r) => s + balanceOf(r.entry), 0),
    }));
}

/**
 * Sheet 3 for one branch: each category spread across the month's week blocks.
 * Returns categoryId -> amount per week, index 0 being week 1.
 */
export function categoryByWeek(
  ledger: Ledger,
  branchId: string,
  year: number,
  month: number
): Record<string, number[]> {
  const weeks = weeksInMonth(year, month);
  const out: Record<string, number[]> = {};
  for (const c of ledger.categories) out[c.id] = Array(weeks).fill(0);

  for (const date of workingDays(year, month)) {
    const entry = ledger.entries[entryKey(branchId, date)];
    if (!entry) continue;
    const w = weekOfMonth(date) - 1;
    for (const c of ledger.categories) out[c.id][w] += entry.amounts[c.id] || 0;
  }
  return out;
}

/**
 * The lines a month's sheets should list: every open line, plus any archived
 * one with figures that month at any branch — so archiving a line never makes
 * an old month's rows or totals change.
 */
export function categoriesForMonth(ledger: Ledger, year: number, month: number): Category[] {
  const days = workingDays(year, month);
  const used = (id: string) =>
    Object.values(ledger.entries).some((e) => !!e.amounts[id] && days.includes(e.date));
  return ledger.categories.filter((c) => !c.archived || used(c.id));
}

/** The lines Enter day shows for one entry: open ones, plus archived lines it already uses. */
export const categoriesForEntry = (categories: Category[], entry?: Entry) =>
  categories.filter((c) => !c.archived || !!entry?.amounts[c.id]);

export type BranchMonth = {
  branchId: string;
  revenue: number;
  operating: number;
  cashMovement: number;
  total: number;
  balance: number;
  salary: number;
  /** Days of the month with nothing recorded at all. */
  missingDays: number;
};

export function branchMonth(
  ledger: Ledger,
  branchId: string,
  year: number,
  month: number
): BranchMonth {
  const rows = daybook(ledger, branchId, year, month);
  const recorded = rows.filter((r) => !isBlank(r.entry));
  const revenue = recorded.reduce((s, r) => s + (r.entry?.revenue || 0), 0);
  const operating = recorded.reduce((s, r) => s + operatingTotal(r.entry, ledger.categories), 0);
  const cashMovement = recorded.reduce(
    (s, r) => s + cashMovementTotal(r.entry, ledger.categories),
    0
  );
  const salary = ledger.salaries[salaryKey(monthKey(year, month), branchId)] || 0;

  return {
    branchId,
    revenue,
    operating,
    cashMovement,
    total: operating + cashMovement,
    balance: revenue - operating - cashMovement,
    salary,
    missingDays: rows.length - recorded.length,
  };
}

/* ── money ──────────────────────────────────────────────────────────────── */

const naira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** 45000 -> "₦45,000". Zero reads as a dash, the way a blank cell does. */
export function formatNaira(amount: number, blankZero = false): string {
  if (amount === 0 && blankZero) return "—";
  const sign = amount < 0 ? "-" : "";
  return `${sign}₦${naira.format(Math.abs(amount))}`;
}

/** Compact for table headers and tiles: 1250000 -> "₦1.25m". */
export function formatShort(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 10_000) return `${sign}₦${Math.round(abs / 1000)}k`;
  return formatNaira(amount);
}

/** Reads digits out of whatever was typed, so "12,000" and "₦12000" both work. */
export function parseAmount(input: string): number {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}
