"use client";

/**
 * The first screen of the accounts app: where the month stands, which branch
 * is behind, and one tap to the day that still needs filling in.
 *
 * Everything on it is read off the daily entries — there is nothing to type
 * here, by design.
 */

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, Lock, Plus } from "lucide-react";
import {
  MONTH_NAMES,
  branchMonth,
  categoriesForMonth,
  categoryByWeek,
  dateKey,
  dayTotal,
  daybook,
  editDeadline,
  formatNaira,
  isBlank,
  isLocked,
  parseDateKey,
  todayKey,
} from "@/lib/accounting";
import { useLedger } from "@/lib/store";
import { DEMO_MONTH, DEMO_YEAR } from "@/data/demo";
import { branchShort, branchesForMonth, can, useBranches, useCurrentUser } from "@/lib/directory";
import { CARD, Figure, LABEL, MonthNav, PRIMARY, PageTitle, mono, syne } from "@/components/shared";

const shortDate = (date: string) =>
  parseDateKey(date).toLocaleDateString("en-NG", { day: "numeric", month: "short" });

export default function Overview() {
  const ledger = useLedger();
  const [year, setYear] = useState(DEMO_YEAR);
  const [month, setMonth] = useState(DEMO_MONTH);
  const today = todayKey();
  const user = useCurrentUser();
  const allBranches = useBranches();
  const branches = branchesForMonth(allBranches, ledger, year, month);
  const firstOfMonth = dateKey(year, month, 1);
  const closed = isLocked(firstOfMonth);

  const months = branches.map((b) => branchMonth(ledger, b.id, year, month));
  const sum = months.reduce(
    (a, m) => ({
      revenue: a.revenue + m.revenue,
      operating: a.operating + m.operating,
      cashMovement: a.cashMovement + m.cashMovement,
      salary: a.salary + m.salary,
    }),
    { revenue: 0, operating: 0, cashMovement: 0, salary: 0 }
  );
  const after = sum.revenue - sum.operating - sum.salary;

  /* Days gone by with nothing written against them — the thing that actually
     goes wrong with a paper book. Future days are not anybody's fault yet. */
  const outstanding = branches.filter((b) => b.active).flatMap((b) =>
    daybook(ledger, b.id, year, month)
      .filter((row) => row.date <= today && isBlank(row.entry))
      .map((row) => ({ branch: b, date: row.date }))
  ).sort((a, b) => (a.date < b.date ? 1 : -1));

  /* Where the money went this month, biggest first. */
  const spend = categoriesForMonth(ledger, year, month).map((c) => {
    const total = branches.reduce(
      (s, b) =>
        s + categoryByWeek(ledger, b.id, year, month)[c.id].reduce((x, y) => x + y, 0),
      0
    );
    return { category: c, total };
  })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
  const biggest = spend[0]?.total || 1;

  return (
    <div>
      <PageTitle
        title="Overview"
        subtitle={`Where ${MONTH_NAMES[month]} stands across every branch`}
      >
        <div className="flex items-center gap-2">
          <MonthNav
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
          />
          {can(user, "edit-book") && (
            <Link href="/entry" className={`${PRIMARY} whitespace-nowrap px-4`}>
              <Plus className="w-4 h-4" />
              Enter day
            </Link>
          )}
        </div>
      </PageTitle>

      {/* WHETHER THIS MONTH CAN STILL CHANGE */}
      <div className="-mt-2 mb-4 flex items-center gap-1.5 text-[12px] text-ink-muted">
        <Lock className="w-3.5 h-3.5 text-ink-subtle" />
        {closed ? (
          <span>
            {MONTH_NAMES[month]} is closed — it could be edited until{" "}
            <span className={mono.className}>{shortDate(editDeadline(firstOfMonth))}</span>.
          </span>
        ) : (
          <span>
            {MONTH_NAMES[month]} is open for changes until{" "}
            <span className={`${mono.className} text-ink-secondary`}>
              {shortDate(editDeadline(firstOfMonth))}
            </span>
            .
          </span>
        )}
      </div>

      {/* HEADLINE FIGURES */}
      <div className={`${CARD} p-4 mb-4 grid grid-cols-2 tny:grid-cols-4 gap-4`}>
        <Figure label="Revenue" value={formatNaira(sum.revenue)} />
        <Figure
          label="Running costs"
          value={formatNaira(sum.operating)}
          hint="Loan and withdrawals excluded"
        />
        <Figure
          label="Cash moved"
          value={formatNaira(sum.cashMovement)}
          tone={sum.cashMovement > 0 ? "amber" : "ink"}
          hint="Loans and withdrawals"
        />
        <Figure
          label="After costs"
          value={formatNaira(after)}
          tone={after < 0 ? "bad" : "good"}
          hint="Salary taken off"
        />
      </div>

      {/* BRANCHES */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-4">
        {months.map((m) => {
          const branch = branches.find((b) => b.id === m.branchId)!;
          const rows = daybook(ledger, m.branchId, year, month);
          const done = rows.length - m.missingDays;
          const pct = Math.round((done / rows.length) * 100);

          return (
            <div key={m.branchId} className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`${syne.className} text-sm font-bold text-ink`}>
                  {branch.short}
                  {!branch.active && (
                    <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-ink-subtle">
                      archived
                    </span>
                  )}
                </div>
                <span
                  className={`${mono.className} text-[11px] px-2 py-0.5 rounded-md border ${
                    m.balance < 0
                      ? "bg-cancelled-bg text-cancelled border-cancelled-border"
                      : "bg-delivered-bg text-delivered border-delivered-border"
                  }`}
                >
                  {formatNaira(m.balance)}
                </span>
              </div>

              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Revenue</span>
                  <span className={mono.className}>{formatNaira(m.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Expenses</span>
                  <span className={mono.className}>{formatNaira(m.total)}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-ink-subtle mb-1">
                  <span>
                    {done} of {rows.length} days recorded
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div
                    className="h-full bg-amber rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* OUTSTANDING DAYS */}
        <div className={CARD}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className={`${syne.className} text-sm font-bold text-ink`}>
              Days still to enter
            </div>
            {outstanding.length > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-muted text-amber-hover border border-amber-border">
                {outstanding.length}
              </span>
            )}
          </div>

          {outstanding.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">
              Every day up to today is written up.
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
              {outstanding.slice(0, 12).map(({ branch, date }) => (
                <Link
                  key={`${branch.id}-${date}`}
                  href={`/entry?branch=${branch.id}&date=${date}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition"
                >
                  <AlertCircle className="w-4 h-4 text-amber shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-ink truncate">{branch.short}</div>
                    <div className="text-[11px] text-ink-subtle">{shortDate(date)}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-subtle shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* WHERE THE MONEY WENT */}
        <div className={CARD}>
          <div className="px-4 py-3 border-b border-border">
            <div className={`${syne.className} text-sm font-bold text-ink`}>
              Where the money went
            </div>
          </div>
          {spend.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">
              Nothing recorded this month yet.
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {spend.slice(0, 7).map(({ category, total }) => (
                <div key={category.id}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[13px] text-ink truncate">
                      {category.label}
                      {category.kind === "cash-movement" && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-ink-subtle">
                          not spend
                        </span>
                      )}
                    </span>
                    <span className={`${mono.className} text-[12px] text-ink-muted shrink-0`}>
                      {formatNaira(total)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        category.kind === "cash-movement" ? "bg-ink-subtle" : "bg-amber"
                      }`}
                      style={{ width: `${Math.round((total / biggest) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LATEST ENTRIES */}
      <div className={`${CARD} mt-4`}>
        <div className="px-4 py-3 border-b border-border">
          <div className={`${syne.className} text-sm font-bold text-ink`}>
            Last entries
          </div>
        </div>
        <div className="divide-y divide-border">
          {Object.values(ledger.entries)
            .filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 6)
            .map((entry) => (
              <Link
                key={`${entry.branchId}-${entry.date}`}
                href={`/entry?branch=${entry.branchId}&date=${entry.date}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink truncate">
                    {branchShort(allBranches, entry.branchId)}
                  </div>
                  <div className="text-[11px] text-ink-subtle">
                    {shortDate(entry.date)}
                    {entry.recordedBy ? ` · ${entry.recordedBy}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`${mono.className} text-[13px] text-ink`}>
                    {formatNaira(entry.revenue)}
                  </div>
                  <div className={`${LABEL}`}>less {formatNaira(dayTotal(entry))}</div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
