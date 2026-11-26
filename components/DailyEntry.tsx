"use client";

/**
 * The one screen anybody types into: a branch, a day, the revenue, and an
 * amount against each line of the expense form.
 *
 * Built for someone working down a paper book, day after day:
 *   - the lines are numbered and in the paper's order, with a dotted leader
 *     from label to amount so the eye does not lose the row;
 *   - Enter moves to the next line, and "Save & next day" moves on to the next
 *     working day — Sundays are skipped, because the book never has them;
 *   - the week strip shows which days of the week are done, missing or ahead;
 *   - switching branch or day with figures not yet saved asks first, rather
 *     than throwing them away.
 *
 * On a desktop the context (branch, day, revenue, totals, save) sits in a
 * column that stays in view while the lines scroll; on a phone it stacks, and
 * the totals and save buttons sit in a bar at the foot.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Eye,
  Lock,
  RotateCcw,
} from "lucide-react";
import {
  Category,
  Entry,
  balanceOf,
  cashMovementLines,
  cashMovementTotal,
  categoriesForEntry,
  dateKey,
  editDeadline,
  entryKey,
  expenseLines,
  formatNaira,
  isBlank,
  isLocked,
  isSunday,
  operatingTotal,
  parseAmount,
  parseDateKey,
  todayKey,
  weekOfMonth,
  weekdayLetter,
  workingDays,
} from "@/lib/accounting";
import { saveEntry, useLedger } from "@/lib/store";
import { branchShort, can, roleLabel, useBranches, useCurrentUser } from "@/lib/directory";
import {
  BranchTabs,
  CARD,
  LABEL,
  PRIMARY,
  SECONDARY,
  mono,
  sentenceDate,
  syne,
} from "@/components/shared";

/** Amounts are held as text while typing so a field can be cleared. */
type Draft = Record<string, string>;
type Target = { branchId: string; date: string };

const naira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
/** 12000 -> "12,000"; nothing for zero, so an untouched line stays blank. */
const asText = (n?: number) => (n && n > 0 ? naira.format(n) : "");

const shiftDay = (date: string, by: number) => {
  const d = parseDateKey(date);
  d.setDate(d.getDate() + by);
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
};

/** The next or previous day the book is kept — Sunday is never written. */
function stepWorkingDay(date: string, by: 1 | -1) {
  let d = shiftDay(date, by);
  while (isSunday(d)) d = shiftDay(d, by);
  return d;
}

/** Monday to Saturday of the calendar week a date falls in. */
function weekAround(date: string): string[] {
  const d = parseDateKey(date);
  const back = (d.getDay() + 6) % 7; // days since Monday
  const monday = shiftDay(date, -back);
  return Array.from({ length: 6 }, (_, i) => shiftDay(monday, i));
}

const dayOfMonth = (date: string) => parseDateKey(date).getDate();

const savedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

/** What a day's figures amount to, for telling whether anything has changed. */
function fingerprint(e?: Pick<Entry, "revenue" | "amounts" | "notes">) {
  const amounts = Object.entries(e?.amounts || {})
    .filter(([, v]) => v > 0)
    .sort();
  const notes = Object.entries(e?.notes || {})
    .filter(([k, v]) => v.trim() && (e?.amounts[k] || 0) > 0)
    .map(([k, v]) => [k, v.trim()])
    .sort();
  return JSON.stringify([e?.revenue || 0, amounts, notes]);
}

/* ── one line of the form ───────────────────────────────────────────────── */

function AmountRow({
  number,
  category,
  value,
  note,
  onValue,
  onNote,
  disabled,
}: {
  number: number;
  category: Category;
  value: string;
  note: string;
  onValue: (v: string) => void;
  onNote: (v: string) => void;
  disabled?: boolean;
}) {
  const filled = parseAmount(value) > 0;
  const noteMissing = filled && category.requiresNote && !note.trim();
  const id = `line-${category.id}`;
  const sub = category.reconcilesWith
    ? `Check against the ${category.reconcilesWith}`
    : category.hint;

  return (
    <div className="group relative transition focus-within:bg-amber-muted">
      {/* The row you are on, marked down the left edge like a finger on the page. */}
      <span
        aria-hidden
        className="absolute left-0 inset-y-0 w-[3px] bg-amber opacity-0 group-focus-within:opacity-100 transition"
      />
      <div className="flex items-center gap-3 pl-3 pr-3 tny:pr-4 py-2">
        <span
          className={`${mono.className} w-6 shrink-0 text-right text-[12px] ${
            filled ? "text-amber-hover" : "text-ink-subtle"
          }`}
        >
          {number}
        </span>

        <label htmlFor={id} className="min-w-0 flex-1 flex items-center gap-3 cursor-pointer">
          <span className="min-w-0">
            <span
              className={`block text-[15px] leading-snug truncate ${
                filled ? "text-ink font-medium" : "text-ink-secondary"
              }`}
            >
              {category.label}
              {category.archived && (
                <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-ink-subtle">
                  archived
                </span>
              )}
            </span>
            {sub && <span className="block text-[12px] text-ink-subtle truncate">{sub}</span>}
          </span>
          <span
            aria-hidden
            className="hidden sm:block flex-1 min-w-4 border-b border-dotted border-border-strong"
          />
        </label>

        <div className="relative shrink-0">
          <span
            className={`${mono.className} pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
              filled ? "text-ink-muted" : "text-ink-subtle"
            }`}
          >
            ₦
          </span>
          <input
            id={id}
            data-field
            inputMode="numeric"
            enterKeyHint="next"
            autoComplete="off"
            value={value}
            onChange={(e) => onValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={() => onValue(asText(parseAmount(value)))}
            placeholder={disabled ? "" : "0"}
            disabled={disabled}
            className={`${mono.className} w-[128px] tny:w-[156px] h-11 pl-7 pr-3 text-base text-right rounded-lg border outline-none transition focus:border-amber focus:ring-2 focus:ring-amber-border focus:bg-surface-raised disabled:cursor-not-allowed ${
              filled
                ? "border-amber-border bg-surface-raised text-ink font-medium"
                : "border-border bg-surface text-ink-muted"
            }`}
          />
        </div>
      </div>

      {filled && category.requiresNote && (
        <div className="pl-12 pr-3 tny:pr-4 pb-2.5">
          <input
            data-field
            enterKeyHint="next"
            value={note}
            disabled={disabled}
            onChange={(e) => onNote(e.target.value)}
            placeholder="What was it spent on?"
            aria-label={`${category.label} — what it was`}
            className={`w-full h-11 px-3 text-base rounded-lg border outline-none transition focus:border-amber focus:ring-2 focus:ring-amber-border ${
              noteMissing
                ? "border-cancelled-border bg-cancelled-bg placeholder:text-cancelled"
                : "border-border bg-surface-raised"
            }`}
          />
        </div>
      )}
    </div>
  );
}

/** A group of lines with its subtotal: running costs, or cash movements. */
function LineGroup({
  title,
  explain,
  lines,
  numberOf,
  total,
  draft,
  notes,
  onValue,
  onNote,
  disabled,
}: {
  title: string;
  explain?: string;
  lines: Category[];
  numberOf: (id: string) => number;
  total: number;
  draft: Draft;
  notes: Record<string, string>;
  onValue: (id: string, v: string) => void;
  onNote: (id: string, v: string) => void;
  disabled: boolean;
}) {
  if (lines.length === 0) return null;
  const filled = lines.filter((c) => parseAmount(draft[c.id] || "") > 0).length;

  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className={`${syne.className} text-sm font-bold text-ink`}>{title}</h2>
          <span className="text-[11px] text-ink-subtle">
            {filled} of {lines.length} filled
          </span>
          <span
            className={`${mono.className} ml-auto text-sm ${total > 0 ? "text-ink" : "text-ink-subtle"}`}
          >
            {formatNaira(total)}
          </span>
        </div>
        {explain && <p className="text-[12px] text-ink-subtle mt-0.5">{explain}</p>}
      </div>
      <div className="divide-y divide-border">
        {lines.map((c) => (
          <AmountRow
            key={c.id}
            number={numberOf(c.id)}
            category={c}
            value={draft[c.id] || ""}
            note={notes[c.id] || ""}
            onValue={(v) => onValue(c.id, v)}
            onNote={(v) => onNote(c.id, v)}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}

/* ── the screen ─────────────────────────────────────────────────────────── */

export default function DailyEntry({
  initialBranchId,
  initialDate,
}: {
  /** Set when arriving from a link that names the day to fill in. */
  initialBranchId?: string;
  initialDate?: string;
} = {}) {
  const ledger = useLedger();
  const user = useCurrentUser();
  const branches = useBranches();
  const open = branches.filter((b) => b.active);
  const today = todayKey();

  const [branchId, setBranchId] = useState(
    initialBranchId && branches.some((b) => b.id === initialBranchId)
      ? initialBranchId
      : open[0]?.id || branches[0].id
  );
  const [date, setDate] = useState(initialDate || today);
  const [revenue, setRevenue] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [justSaved, setJustSaved] = useState(false);
  /** Where someone asked to go while holding unsaved figures. */
  const [pending, setPending] = useState<Target | null>(null);

  const formRef = useRef<HTMLDivElement>(null);

  /* An archived branch can still be opened from an old month's book to read;
     it just is not offered for new days. */
  const tabs = open.some((b) => b.id === branchId)
    ? open
    : [...open, ...branches.filter((b) => b.id === branchId)];

  const stored = ledger.entries[entryKey(branchId, date)];

  /* Opening a different branch or day loads whatever is already written.
     Done during render rather than in an effect, so the fields are never
     briefly blank — the pattern React documents for state derived from a
     changing key. The stamp also covers the ledger arriving after hydration,
     when the stored book is read out of this browser for the first time. */
  const stamp = `${branchId}|${date}|${stored?.recordedAt || ""}`;
  /* Starts empty so the first render loads too: the shell only mounts this
     once the book is read, so there may be no later change to trigger it. */
  const [loadedStamp, setLoadedStamp] = useState("");
  if (loadedStamp !== stamp) {
    setLoadedStamp(stamp);
    setRevenue(asText(stored?.revenue));
    setDraft(
      Object.fromEntries(
        Object.entries(stored?.amounts || {})
          .filter(([, v]) => v > 0)
          .map(([k, v]) => [k, asText(v)])
      )
    );
    setNotes(stored?.notes || {});
  }

  const entry: Entry = useMemo(
    () => ({
      branchId,
      date,
      revenue: parseAmount(revenue),
      amounts: Object.fromEntries(
        Object.entries(draft)
          .map(([k, v]) => [k, parseAmount(v)] as const)
          .filter(([, v]) => v > 0)
      ),
      notes,
    }),
    [branchId, date, revenue, draft, notes]
  );

  /* The form lists every open line, plus any archived line this day already
     has a figure on — so an old day can still be read and corrected. */
  const lines = categoriesForEntry(ledger.categories, stored);
  const expenses = expenseLines(lines);
  const movements = cashMovementLines(lines);
  const order = [...expenses, ...movements].map((c) => c.id);
  const numberOf = (id: string) => order.indexOf(id) + 1;

  const operating = operatingTotal(entry, ledger.categories);
  const moved = cashMovementTotal(entry, ledger.categories);
  const balance = balanceOf(entry);
  const filledLines = Object.keys(entry.amounts).length;

  const missingNote = lines.some(
    (c) => c.requiresNote && (entry.amounts[c.id] || 0) > 0 && !(notes[c.id] || "").trim()
  );

  const sunday = isSunday(date);
  const locked = isLocked(date);
  const allowed = can(user, "edit-book");
  const readOnly = locked || !allowed || sunday;

  const hasSomething = entry.revenue > 0 || filledLines > 0;
  const dirty = !readOnly && fingerprint(entry) !== fingerprint(stored);
  const canSave = !readOnly && hasSomething && !missingNote && (dirty || !stored);

  /* Closing the tab or reloading with figures unsaved asks the browser to warn. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const touched = () => setJustSaved(false);
  const set = (id: string, value: string) => {
    setDraft((d) => ({ ...d, [id]: value }));
    touched();
  };
  const setNote = (id: string, value: string) => {
    setNotes((n) => ({ ...n, [id]: value }));
    touched();
  };

  const moveTo = ({ branchId: b, date: d }: Target) => {
    setBranchId(b);
    setDate(d);
    setPending(null);
    setJustSaved(false);
  };

  /** Every change of branch or day comes through here, so nothing typed is lost. */
  const go = (target: Target) => {
    if (target.branchId === branchId && target.date === date) return;
    if (dirty) setPending(target);
    else moveTo(target);
  };

  const commit = () => {
    if (!canSave) return false;
    const ok = saveEntry({ ...entry, recordedBy: user?.name });
    if (ok) setJustSaved(true);
    return ok;
  };

  const saveAndNext = () => {
    if (commit()) moveTo({ branchId, date: stepWorkingDay(date, 1) });
  };

  const revert = () => {
    setRevenue(asText(stored?.revenue));
    setDraft(
      Object.fromEntries(Object.entries(stored?.amounts || {}).map(([k, v]) => [k, asText(v)]))
    );
    setNotes(stored?.notes || {});
  };

  /* Enter walks down the form like a finger down the page; on the last field,
     or with Ctrl/Cmd held anywhere, it saves. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (e.key !== "Enter" || !target.matches("input[data-field]")) return;
    e.preventDefault();
    const fields = Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>("input[data-field]:not(:disabled)") || []
    );
    const next = fields[fields.indexOf(target as HTMLInputElement) + 1];
    if (next && !e.metaKey && !e.ctrlKey) next.focus();
    else {
      target.blur(); // formats the amount before it is read back
      commit();
    }
  };

  /* The week strip and the "next missing" shortcut both read this branch's book. */
  const week = weekAround(date);
  const statusOf = (d: string) =>
    !isBlank(ledger.entries[entryKey(branchId, d)])
      ? "done"
      : d <= today
        ? "missing"
        : "ahead";
  const month = parseDateKey(date);
  const firstMissing = workingDays(month.getFullYear(), month.getMonth()).find(
    (d) => d <= today && d !== date && statusOf(d) === "missing"
  );

  /* ── pieces shared by the desktop column and the phone bar ── */

  const saveButtons = (stack: boolean) =>
    readOnly ? null : (
      <div className={`flex gap-2 ${stack ? "flex-col" : ""}`}>
        <button
          onClick={saveAndNext}
          disabled={!canSave}
          className={`${PRIMARY} ${stack ? "w-full" : "flex-1 px-3"}`}
        >
          {stack ? "Save & next day" : "Save & next"}
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={commit}
          disabled={!canSave}
          className={`${SECONDARY} ${stack ? "w-full" : "flex-1 px-3"} ${
            justSaved && !dirty ? "!text-delivered !border-delivered-border" : ""
          }`}
        >
          {justSaved && !dirty && <Check className="w-4 h-4" />}
          {justSaved && !dirty ? "Saved" : stored ? "Save changes" : "Save"}
        </button>
      </div>
    );

  const lockedChip = (
    <span className="h-11 px-4 rounded-lg border border-border bg-surface text-sm text-ink-muted flex items-center justify-center gap-2">
      {locked ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      {sunday ? "No Sundays" : locked ? "Month closed" : "Read only"}
    </span>
  );

  return (
    <div
      ref={formRef}
      onKeyDown={onKeyDown}
      className="pb-40 lg:pb-0 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6 lg:items-start"
    >
      {/* ── LEFT: which day, its revenue, its totals ─────────────────────── */}
      <div className="space-y-4 mb-4 lg:mb-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:p-0.5 lg:-m-0.5">
        <section className={`${CARD} p-4`}>
          <div className={`${LABEL} mb-2`}>Branch</div>
          <BranchTabs
            branches={tabs}
            value={branchId}
            onChange={(b) => go({ branchId: b, date })}
          />

          <div className="flex items-center justify-between mt-4 mb-2">
            <span className={LABEL}>Day</span>
            <span className="flex items-center gap-3 text-[11px] text-ink-subtle">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-delivered" /> Written up
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber" /> Missing
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => go({ branchId, date: stepWorkingDay(date, -1) })}
              aria-label="Previous working day"
              className="w-11 h-11 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-muted hover:bg-surface cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={date}
              aria-label="Day"
              onChange={(e) => e.target.value && go({ branchId, date: e.target.value })}
              className={`${mono.className} flex-1 min-w-0 px-3 h-11 text-base rounded-lg border border-border bg-surface-raised text-ink outline-none focus:border-amber focus:ring-2 focus:ring-amber-border`}
            />
            <button
              onClick={() => go({ branchId, date: stepWorkingDay(date, 1) })}
              aria-label="Next working day"
              className="w-11 h-11 shrink-0 rounded-lg border border-border flex items-center justify-center text-ink-muted hover:bg-surface cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* THE WEEK — done, missing or still ahead, for this branch */}
          <div className="mt-3 grid grid-cols-6 gap-1.5" role="group" aria-label="This week">
            {week.map((d) => {
              const status = statusOf(d);
              const current = d === date;
              return (
                <button
                  key={d}
                  onClick={() => go({ branchId, date: d })}
                  aria-current={current ? "date" : undefined}
                  aria-label={`${sentenceDate(d)}, ${
                    status === "done" ? "written up" : status === "missing" ? "not written up" : "still ahead"
                  }`}
                  className={`h-14 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                    current
                      ? "bg-ink border-ink text-surface-raised"
                      : status === "done"
                        ? "bg-delivered-bg border-delivered-border text-ink hover:border-delivered"
                        : status === "missing"
                          ? "bg-surface-raised border-amber-border text-ink hover:border-amber"
                          : "bg-surface border-border border-dashed text-ink-subtle hover:border-border-strong"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-70">
                    {weekdayLetter(d)}
                  </span>
                  <span className={`${mono.className} text-sm leading-none`}>{dayOfMonth(d)}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      status === "done"
                        ? "bg-delivered"
                        : status === "missing"
                          ? "bg-amber"
                          : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
          {/* WHAT THIS DAY IS */}
          <div className="mt-3 pt-3 border-t border-border space-y-1.5 text-[12px]">
            <div className="text-ink-secondary">
              <span className="font-medium">{sentenceDate(date)}</span>
              <span className="text-ink-subtle"> · week {weekOfMonth(date)} of the book</span>
            </div>
            {stored ? (
              <div className="text-ink-muted">
                Written up{stored.recordedBy ? ` by ${stored.recordedBy}` : ""}
                {stored.recordedAt ? ` · ${savedAt(stored.recordedAt)}` : ""}
              </div>
            ) : (
              !sunday && <div className="text-ink-muted">Not written up yet.</div>
            )}
            {firstMissing && !readOnly && (
              <button
                onClick={() => go({ branchId, date: firstMissing })}
                className="flex items-center gap-1 text-amber-hover hover:underline cursor-pointer"
              >
                First missing day this month: {sentenceDate(firstMissing)}
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {!readOnly && (
              <div className="flex items-center gap-1.5 text-ink-subtle">
                <Lock className="w-3 h-3 shrink-0" />
                Open for changes until {sentenceDate(editDeadline(date))}
              </div>
            )}
          </div>
        </section>

        {/* CAN THIS DAY BE CHANGED */}
        {sunday ? (
          <div className="flex gap-3 px-4 py-3 rounded-xl bg-surface-raised border border-border-strong">
            <AlertTriangle className="w-4 h-4 text-amber-hover shrink-0 mt-0.5" />
            <div className="text-[13px] text-ink-secondary">
              <span className="font-semibold text-ink">Sunday isn&apos;t kept in the book.</span>{" "}
              <button
                onClick={() => go({ branchId, date: stepWorkingDay(date, -1) })}
                className="underline cursor-pointer"
              >
                Saturday
              </button>{" "}
              or{" "}
              <button
                onClick={() => go({ branchId, date: stepWorkingDay(date, 1) })}
                className="underline cursor-pointer"
              >
                Monday
              </button>
              ?
            </div>
          </div>
        ) : locked ? (
          <div className="flex gap-3 px-4 py-3 rounded-xl bg-surface-raised border border-border-strong">
            <Lock className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
            <div className="text-[13px] text-ink-secondary">
              <span className="font-semibold text-ink">This month is closed.</span> It could be
              corrected until {sentenceDate(editDeadline(date))}. The figures can be read but not
              changed.
            </div>
          </div>
        ) : !allowed ? (
          <div className="flex gap-3 px-4 py-3 rounded-xl bg-surface-raised border border-border-strong">
            <Eye className="w-4 h-4 text-ink-muted shrink-0 mt-0.5" />
            <div className="text-[13px] text-ink-secondary">
              <span className="font-semibold text-ink">Read only.</span> Your account is a{" "}
              {user ? roleLabel(user.role) : "viewer"}, so you can see this day but not change it.
            </div>
          </div>
        ) : null}

        {/* REVENUE */}
        <section className={`${CARD} p-4 border-amber-border`}>
          <label htmlFor="revenue" className="flex items-baseline justify-between gap-2 mb-2">
            <span className={`${syne.className} text-sm font-bold text-ink`}>Revenue</span>
            <span className="text-[11px] text-ink-subtle">cash received today</span>
          </label>
          <div className="relative">
            <span
              className={`${mono.className} pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-ink-muted`}
            >
              ₦
            </span>
            <input
              id="revenue"
              data-field
              inputMode="numeric"
              enterKeyHint="next"
              autoComplete="off"
              value={revenue}
              onChange={(e) => {
                setRevenue(e.target.value);
                touched();
              }}
              onFocus={(e) => e.target.select()}
              onBlur={() => setRevenue(asText(parseAmount(revenue)))}
              placeholder={readOnly ? "" : "0"}
              disabled={readOnly}
              className={`${mono.className} w-full h-14 pl-10 pr-4 text-[22px] rounded-lg border border-amber-border bg-amber-muted/50 text-ink outline-none transition focus:border-amber focus:ring-2 focus:ring-amber-border focus:bg-surface-raised disabled:cursor-not-allowed disabled:bg-surface`}
            />
          </div>
          <p className="mt-2 text-[12px] text-ink-subtle truncate">
            Cash in hand from deliveries — not what is owed.
          </p>
        </section>

        {/* TOTALS AND SAVE — desktop; the phone has the bar below */}
        <section className={`${CARD} p-4 hidden lg:block`}>
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Running costs</dt>
              <dd className={`${mono.className} text-ink`}>{formatNaira(operating)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Cash moved</dt>
              <dd className={`${mono.className} ${moved ? "text-ink" : "text-ink-subtle"}`}>
                {formatNaira(moved)}
              </dd>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-border">
              <dt className="text-ink-secondary font-medium">Total for the day</dt>
              <dd className={`${mono.className} text-ink font-medium`}>
                {formatNaira(operating + moved)}
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex items-end justify-between">
            <span className={LABEL}>Balance</span>
            <span
              className={`${mono.className} text-2xl ${balance < 0 ? "text-cancelled" : "text-ink"}`}
            >
              {formatNaira(balance)}
            </span>
          </div>

          <div className="mt-4">{readOnly ? lockedChip : saveButtons(true)}</div>

          {missingNote && (
            <p className="mt-2 text-[12px] text-cancelled">
              Say what the &quot;Others&quot; amount was before saving.
            </p>
          )}
          {!readOnly && (
            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-subtle">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" /> Enter: next line · last line saves
              </span>
              {stored && dirty && (
                <button
                  onClick={revert}
                  className="flex items-center gap-1 hover:text-ink cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Undo changes
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── RIGHT: the lines of the form, in the paper's order ───────────── */}
      <div className="space-y-4 min-w-0">
        <LineGroup
          title="Expenses"
          lines={expenses}
          numberOf={numberOf}
          total={operating}
          draft={draft}
          notes={notes}
          onValue={set}
          onNote={setNote}
          disabled={readOnly}
        />
        <LineGroup
          title="Cash movements"
          explain="Counted in the day's total, but not as money spent — it was lent or taken out."
          lines={movements}
          numberOf={numberOf}
          total={moved}
          draft={draft}
          notes={notes}
          onValue={set}
          onNote={setNote}
          disabled={readOnly}
        />
      </div>

      {/* ── PHONE: totals and save, always to hand ───────────────────────── */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-raised border-t border-border px-4 pt-2.5 shadow-[0_-4px_16px_rgba(17,24,39,0.06)]"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <span className="text-[12px] text-ink-muted">
            Total{" "}
            <span className={`${mono.className} text-ink`}>{formatNaira(operating + moved)}</span>
          </span>
          <span className="text-[12px] text-ink-muted">
            Balance{" "}
            <span
              className={`${mono.className} text-[15px] ${balance < 0 ? "text-cancelled" : "text-ink"}`}
            >
              {formatNaira(balance)}
            </span>
          </span>
        </div>
        {readOnly ? lockedChip : saveButtons(false)}
        {missingNote && (
          <p className="mt-1.5 text-[11px] text-cancelled">
            Say what the &quot;Others&quot; amount was before saving.
          </p>
        )}
      </div>

      {/* ── UNSAVED FIGURES: ask before moving on ────────────────────────── */}
      {pending && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-title"
        >
          <div className={`${CARD} w-full max-w-sm p-5 shadow-xl`}>
            <h2 id="unsaved-title" className={`${syne.className} text-base font-bold text-ink`}>
              Save {branchShort(branches, branchId)}, {sentenceDate(date)} first?
            </h2>
            <p className="text-[13px] text-ink-muted mt-1">
              You have figures here that aren&apos;t saved. Moving on without saving loses them.
            </p>
            <div className="mt-5 space-y-2">
              <button
                autoFocus
                onClick={() => {
                  if (commit()) moveTo(pending);
                }}
                disabled={!canSave}
                className={`${PRIMARY} w-full`}
              >
                Save and go on
              </button>
              {!canSave && missingNote && (
                <p className="text-[12px] text-cancelled">
                  Can&apos;t save yet — the &quot;Others&quot; amount needs a note.
                </p>
              )}
              <button
                onClick={() => moveTo(pending)}
                className={`${SECONDARY} w-full !text-cancelled`}
              >
                Discard and go on
              </button>
              <button onClick={() => setPending(null)} className={`${SECONDARY} w-full`}>
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
