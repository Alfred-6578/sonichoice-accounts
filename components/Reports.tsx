"use client";

/**
 * Taking the month out of the system.
 *
 * Everyone who keeps a book like this eventually needs it in a spreadsheet,
 * so both sheets export as CSV — built from the same aggregates the screens
 * use, which is the point of keeping the maths in lib/accounting.ts.
 */

import { useState } from "react";
import { Download, FileSpreadsheet, AlertTriangle } from "lucide-react";
import {
  MONTH_NAMES,
  balanceOf,
  branchMonth,
  categoriesForMonth,
  categoryByWeek,
  dayTotal,
  daybook,
  formatNaira,
  isBlank,
  monthKey,
  weeksInMonth,
} from "@/lib/accounting";
import { useLedger } from "@/lib/store";
import { DEMO_MONTH, DEMO_YEAR } from "@/data/demo";
import { branchesForMonth, useBranches } from "@/lib/directory";
import { BranchTabs, CARD, Figure, MonthNav, PageTitle, mono, syne } from "@/components/shared";

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map(csvCell).join(",")).join("\n");

function download(filename: string, csv: string) {
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const ledger = useLedger();
  const [year, setYear] = useState(DEMO_YEAR);
  const [month, setMonth] = useState(DEMO_MONTH);
  const [branchId, setBranchId] = useState("all");
  const monthBranches = branchesForMonth(useBranches(), ledger, year, month);

  /* A branch picked in another month may not be in this one; show all then. */
  const picked = monthBranches.filter((b) => b.id === branchId);
  const branches = picked.length ? picked : monthBranches;

  const totals = branches
    .map((b) => branchMonth(ledger, b.id, year, month))
    .reduce(
      (a, m) => ({
        revenue: a.revenue + m.revenue,
        total: a.total + m.total,
        balance: a.balance + m.balance,
        missingDays: a.missingDays + m.missingDays,
      }),
      { revenue: 0, total: 0, balance: 0, missingDays: 0 }
    );

  const stamp = `${MONTH_NAMES[month]}-${year}`;

  const exportDayBook = () => {
    const rows: (string | number)[][] = [
      ["Branch", "Date", "Day", "Revenue", "Expenses", "Balance", "Recorded"],
    ];
    for (const b of branches) {
      for (const row of daybook(ledger, b.id, year, month)) {
        rows.push([
          b.short,
          row.date,
          row.weekday,
          row.entry?.revenue || 0,
          dayTotal(row.entry),
          balanceOf(row.entry),
          isBlank(row.entry) ? "no" : "yes",
        ]);
      }
    }
    download(`day-book-${stamp}.csv`, toCsv(rows));
  };

  const exportMonthly = () => {
    const weeks = weeksInMonth(year, month);
    const rows: (string | number)[][] = [
      [
        "Branch",
        "Category",
        "Type",
        ...Array.from({ length: weeks }, (_, w) => `Week ${w + 1}`),
        "Total",
      ],
    ];
    for (const b of branches) {
      const table = categoryByWeek(ledger, b.id, year, month);
      for (const c of categoriesForMonth(ledger, year, month)) {
        const weekly = table[c.id];
        rows.push([
          b.short,
          c.label,
          c.kind === "cash-movement" ? "cash movement" : "expense",
          ...weekly,
          weekly.reduce((x, y) => x + y, 0),
        ]);
      }
      const m = branchMonth(ledger, b.id, year, month);
      rows.push([b.short, "Salary", "monthly", ...Array(weeks).fill(""), m.salary]);
      rows.push([b.short, "Revenue", "income", ...Array(weeks).fill(""), m.revenue]);
    }
    download(`monthly-sheet-${stamp}.csv`, toCsv(rows));
  };

  return (
    <div>
      <PageTitle
        title="Reports"
        subtitle="Pull a month out as a spreadsheet"
      >
        <MonthNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </PageTitle>

      <div className="mb-4">
        <BranchTabs
          branches={monthBranches}
          value={picked.length ? branchId : "all"}
          onChange={setBranchId}
          allLabel="All"
        />
      </div>

      <div className={`${CARD} p-4 mb-4 grid grid-cols-2 tny:grid-cols-4 gap-4`}>
        <Figure label="Revenue" value={formatNaira(totals.revenue)} />
        <Figure label="Expenses" value={formatNaira(totals.total)} />
        <Figure
          label="Balance"
          value={formatNaira(totals.balance)}
          tone={totals.balance < 0 ? "bad" : "good"}
        />
        <Figure
          label="Not recorded"
          value={`${totals.missingDays} days`}
          tone={totals.missingDays > 0 ? "amber" : "ink"}
        />
      </div>

      {totals.missingDays > 0 && (
        <div className="mb-4 flex gap-3 px-4 py-3 rounded-xl bg-amber-muted border border-amber-border">
          <AlertTriangle className="w-4 h-4 text-amber-hover shrink-0 mt-0.5" />
          <div className="text-[12px] text-ink-secondary">
            {totals.missingDays} working{" "}
            {totals.missingDays === 1 ? "day has" : "days have"} nothing against{" "}
            {totals.missingDays === 1 ? "it" : "them"}. They go out as zeroes
            with a <span className={mono.className}>Recorded: no</span> column,
            so whoever reads the file can tell a quiet day from a missing one.
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            title: "Day book",
            body: "Every working day with revenue, expenses and balance. One row per branch per day.",
            onClick: exportDayBook,
          },
          {
            title: "Monthly sheet",
            body: "Each category across the month's week blocks, with salary and revenue on the end.",
            onClick: exportMonthly,
          },
        ].map((card) => (
          <div key={card.title} className={`${CARD} p-4 flex flex-col`}>
            <FileSpreadsheet className="w-5 h-5 text-amber mb-3" />
            <div className={`${syne.className} text-sm font-bold text-ink mb-1`}>
              {card.title}
            </div>
            <p className="text-[12px] text-ink-muted flex-1">{card.body}</p>
            <button
              onClick={card.onClick}
              className={`${syne.className} mt-4 h-10 rounded-lg border border-border text-sm font-bold text-ink flex items-center justify-center gap-2 hover:bg-surface cursor-pointer`}
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 px-4 py-3 rounded-xl border border-border bg-surface-raised text-[12px] text-ink-muted">
        Coming when this is a real service: a signed-off month that can no
        longer be edited, PDF for printing, and sending the file straight to
        whoever needs it ({monthKey(year, month)}).
      </div>
    </div>
  );
}
