"use client";

/**
 * Sheet 2: revenue, expenses and balance for every working day of a month,
 * with the week blocks totalled the way the book does it.
 *
 * Nothing here is typed — it is the daily entries added up. The one thing it
 * does that paper cannot is show the days nobody recorded, which on paper just
 * look like an empty row.
 */

import { Fragment, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";
import {
  DayRow,
  MONTH_NAMES,
  balanceOf,
  branchMonth,
  dayTotal,
  daybook,
  formatNaira,
  groupByWeek,
  isBlank,
  parseDateKey,
} from "@/lib/accounting";
import { useLedger } from "@/lib/store";
import { DEMO_MONTH, DEMO_YEAR } from "@/data/demo";
import { Branch, branchesForMonth, useBranches } from "@/lib/directory";
import { BranchTabs, CARD, Figure, LABEL, MonthNav, mono, syne } from "@/components/shared";

/** Every day in the book opens on Enter day — to edit, or to read once closed. */
const dayHref = (branchId: string, date: string) =>
  `/entry?branch=${encodeURIComponent(branchId)}&date=${date}`;

const dayNumber = (date: string) =>
  `${parseDateKey(date).getDate()}/${parseDateKey(date).getMonth() + 1}`;

const Amount = ({
  value,
  tone,
  blank,
}: {
  value: number;
  tone?: "good" | "bad";
  blank?: boolean;
}) => (
  <span
    className={`${mono.className} text-[13px] ${
      blank
        ? "text-ink-subtle"
        : tone === "bad"
          ? "text-cancelled"
          : tone === "good"
            ? "text-delivered"
            : "text-ink"
    }`}
  >
    {blank ? "—" : formatNaira(value)}
  </span>
);

/** One branch down the page: the readable view, and the one a phone can hold. */
function SingleBranch({ rows, branchId }: { rows: DayRow[]; branchId: string }) {
  const blocks = groupByWeek(rows);
  const grand = blocks.reduce(
    (acc, b) => ({
      revenue: acc.revenue + b.revenue,
      expenses: acc.expenses + b.expenses,
      balance: acc.balance + b.balance,
    }),
    { revenue: 0, expenses: 0, balance: 0 }
  );

  return (
    <div className={CARD}>
      <div className="grid grid-cols-[1fr_repeat(3,minmax(84px,1fr))_16px] gap-2 px-4 py-2.5 border-b border-border bg-surface rounded-t-xl">
        <div className={LABEL}>Date</div>
        <div className={`${LABEL} text-right`}>Revenue</div>
        <div className={`${LABEL} text-right`}>Expenses</div>
        <div className={`${LABEL} text-right`}>Balance</div>
        <div />
      </div>

      {blocks.map((block) => (
        <div key={block.week}>
          <div className="px-4 py-1.5 bg-surface/60 border-b border-border text-[11px] uppercase tracking-wider text-ink-subtle">
            Week {block.week}
          </div>

          {block.rows.map((row) => {
            const blank = isBlank(row.entry);
            const balance = balanceOf(row.entry);
            return (
              <Link
                key={row.date}
                href={dayHref(branchId, row.date)}
                aria-label={`Open ${dayNumber(row.date)}`}
                className={`group grid grid-cols-[1fr_repeat(3,minmax(84px,1fr))_16px] gap-2 px-4 py-2.5 border-b border-border items-center transition hover:bg-amber-muted/60 focus-visible:bg-amber-muted outline-none ${
                  blank ? "bg-surface/40" : ""
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`${mono.className} text-[13px] text-ink`}>
                    {dayNumber(row.date)}
                  </span>
                  <span className="text-[11px] text-ink-subtle">{row.weekday}</span>
                  {blank && (
                    <AlertCircle
                      className="w-3.5 h-3.5 text-amber shrink-0"
                      aria-label="Not recorded"
                    />
                  )}
                </div>
                <div className="text-right">
                  <Amount value={row.entry?.revenue || 0} blank={blank} />
                </div>
                <div className="text-right">
                  <Amount value={dayTotal(row.entry)} blank={blank} />
                </div>
                <div className="text-right">
                  <Amount
                    value={balance}
                    blank={blank}
                    tone={balance < 0 ? "bad" : "good"}
                  />
                </div>
                <ChevronRight className="w-4 h-4 text-ink-subtle opacity-40 group-hover:opacity-100 transition" />
              </Link>
            );
          })}

          <div className="grid grid-cols-[1fr_repeat(3,minmax(84px,1fr))_16px] gap-2 px-4 py-2.5 border-b border-border bg-amber-muted/50">
            <div className={`${syne.className} text-[12px] font-bold text-ink`}>
              Total for week {block.week}
            </div>
            <div className="text-right">
              <Amount value={block.revenue} />
            </div>
            <div className="text-right">
              <Amount value={block.expenses} />
            </div>
            <div className="text-right">
              <Amount value={block.balance} tone={block.balance < 0 ? "bad" : "good"} />
            </div>
            <div />
          </div>
        </div>
      ))}

      <div className="grid grid-cols-[1fr_repeat(3,minmax(84px,1fr))_16px] gap-2 px-4 py-3 bg-ink rounded-b-xl">
        <div className={`${syne.className} text-[12px] font-bold text-white`}>
          Grand total
        </div>
        <div className={`${mono.className} text-[13px] text-white text-right`}>
          {formatNaira(grand.revenue)}
        </div>
        <div className={`${mono.className} text-[13px] text-white text-right`}>
          {formatNaira(grand.expenses)}
        </div>
        <div
          className={`${mono.className} text-[13px] text-right ${
            grand.balance < 0 ? "text-cancelled" : "text-amber"
          }`}
        >
          {formatNaira(grand.balance)}
        </div>
        <div />
      </div>
    </div>
  );
}

/** Every branch across the page, the way the original sheet is laid out. */
function AllBranches({
  year,
  month,
  branches,
}: {
  year: number;
  month: number;
  branches: Branch[];
}) {
  const ledger = useLedger();
  const books = branches.map((b) => ({
    branch: b,
    rows: daybook(ledger, b.id, year, month),
  }));
  const dates = books[0].rows;

  const cols = `minmax(72px,0.8fr) ${branches.map(
    () => "repeat(3, minmax(78px, 1fr))"
  ).join(" ")}`;

  return (
    <div className={`${CARD} overflow-x-auto`}>
      <div style={{ minWidth: 100 + branches.length * 230 }}>
        <div
          className="grid gap-2 px-4 py-2 border-b border-border bg-surface rounded-t-xl"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={LABEL}>Date</div>
          {branches.map((b) => (
            <div
              key={b.id}
              className={`${syne.className} col-span-3 text-center text-[12px] font-bold text-ink`}
            >
              {b.short}
            </div>
          ))}
        </div>

        <div
          className="grid gap-2 px-4 py-1.5 border-b border-border bg-surface/60"
          style={{ gridTemplateColumns: cols }}
        >
          <div />
          {branches.map((b) => (
            <Fragment key={b.id}>
              <div className={`${LABEL} text-right`}>Rev</div>
              <div className={`${LABEL} text-right`}>Exp</div>
              <div className={`${LABEL} text-right`}>Bal</div>
            </Fragment>
          ))}
        </div>

        {dates.map((row, i) => (
          <div
            key={row.date}
            className="grid gap-2 px-4 py-2 border-b border-border items-center"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="flex items-center gap-1.5">
              <span className={`${mono.className} text-[12px] text-ink`}>
                {dayNumber(row.date)}
              </span>
              <span className="text-[10px] text-ink-subtle">{row.weekday}</span>
            </div>
            {books.map(({ branch, rows }) => {
              const entry = rows[i]?.entry;
              const blank = isBlank(entry);
              const balance = balanceOf(entry);
              return (
                <Link
                  key={branch.id}
                  href={dayHref(branch.id, row.date)}
                  aria-label={`Open ${branch.short}, ${dayNumber(row.date)}`}
                  className="col-span-3 grid grid-cols-3 gap-2 -my-1 py-1 rounded-md transition hover:bg-amber-muted focus-visible:bg-amber-muted outline-none"
                >
                  <div className="text-right">
                    <Amount value={entry?.revenue || 0} blank={blank} />
                  </div>
                  <div className="text-right">
                    <Amount value={dayTotal(entry)} blank={blank} />
                  </div>
                  <div className="text-right">
                    <Amount
                      value={balance}
                      blank={blank}
                      tone={balance < 0 ? "bad" : "good"}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ))}

        <div
          className="grid gap-2 px-4 py-3 bg-ink rounded-b-xl"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={`${syne.className} text-[12px] font-bold text-white`}>
            Total
          </div>
          {branches.map((b) => {
            const m = branchMonth(ledger, b.id, year, month);
            return (
              <Fragment key={b.id}>
                <div
                  className={`${mono.className} text-[12px] text-white text-right`}
                >
                  {formatNaira(m.revenue)}
                </div>
                <div
                  className={`${mono.className} text-[12px] text-white text-right`}
                >
                  {formatNaira(m.total)}
                </div>
                <div
                  className={`${mono.className} text-[12px] text-right ${
                    m.balance < 0 ? "text-cancelled" : "text-amber"
                  }`}
                >
                  {formatNaira(m.balance)}
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DayBook() {
  const ledger = useLedger();
  const [year, setYear] = useState(DEMO_YEAR);
  const [month, setMonth] = useState(DEMO_MONTH);
  const branches = branchesForMonth(useBranches(), ledger, year, month);
  const [picked, setBranchId] = useState(branches[0]?.id || "all");
  /* A branch archived before this month is not in its book; fall back to all. */
  const branchId = picked === "all" || branches.some((b) => b.id === picked) ? picked : "all";

  const all = branchId === "all";
  const summary = all
    ? branches.map((b) => branchMonth(ledger, b.id, year, month)).reduce(
        (a, m) => ({
          revenue: a.revenue + m.revenue,
          total: a.total + m.total,
          balance: a.balance + m.balance,
          missingDays: a.missingDays + m.missingDays,
        }),
        { revenue: 0, total: 0, balance: 0, missingDays: 0 }
      )
    : branchMonth(ledger, branchId, year, month);

  return (
    <div>
      <div className="flex flex-col vsm:flex-row vsm:items-center gap-3 mb-4">
        <MonthNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
        <div className="flex-1 min-w-0">
          <BranchTabs
            branches={branches}
            value={branchId}
            onChange={setBranchId}
            allLabel="All"
          />
        </div>
      </div>

      <div className={`${CARD} p-4 mb-4 grid grid-cols-2 tny:grid-cols-4 gap-4`}>
        <Figure label="Revenue" value={formatNaira(summary.revenue)} />
        <Figure label="Expenses" value={formatNaira(summary.total)} />
        <Figure
          label="Balance"
          value={formatNaira(summary.balance)}
          tone={summary.balance < 0 ? "bad" : "good"}
        />
        <Figure
          label="Not recorded"
          value={`${summary.missingDays} ${summary.missingDays === 1 ? "day" : "days"}`}
          tone={summary.missingDays > 0 ? "amber" : "ink"}
          hint={`${MONTH_NAMES[month]} ${year}`}
        />
      </div>

      {all ? (
        <AllBranches year={year} month={month} branches={branches} />
      ) : (
        <SingleBranch branchId={branchId} rows={daybook(ledger, branchId, year, month)} />
      )}
    </div>
  );
}
