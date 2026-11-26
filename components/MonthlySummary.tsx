"use client";

/**
 * Sheet 3: every category down the page, the month's week blocks across it,
 * and the branches side by side when that is what you want to see.
 *
 * Salary is the one figure typed here rather than in the daily book, because
 * it is paid once a month and set centrally — which is exactly where it sits
 * on the paper sheet too.
 */

import { useState } from "react";
import { Lock } from "lucide-react";
import {
  branchMonth,
  cashMovementLines,
  categoriesForMonth,
  expenseLines,
  categoryByWeek,
  dateKey,
  editDeadline,
  formatNaira,
  isLocked,
  monthKey,
  parseAmount,
  weeksInMonth,
} from "@/lib/accounting";
import { saveSalary, useLedger } from "@/lib/store";
import { DEMO_MONTH, DEMO_YEAR } from "@/data/demo";
import { Branch, branchesForMonth, can, useBranches, useCurrentUser } from "@/lib/directory";
import {
  BranchTabs,
  CARD,
  Figure,
  LABEL,
  MonthNav,
  mono,
  sentenceDate,
  syne,
} from "@/components/shared";

const Cell = ({ value, strong }: { value: number; strong?: boolean }) => (
  <div
    className={`${mono.className} text-right text-[12px] ${
      value === 0 ? "text-ink-subtle" : strong ? "text-ink font-medium" : "text-ink"
    }`}
  >
    {value === 0 ? "—" : formatNaira(value)}
  </div>
);

/** One branch: categories against the month's week blocks. */
function ByWeek({ branchId, year, month }: { branchId: string; year: number; month: number }) {
  const ledger = useLedger();
  const weeks = weeksInMonth(year, month);
  const table = categoryByWeek(ledger, branchId, year, month);
  const cats = categoriesForMonth(ledger, year, month);
  const cols = `minmax(150px,1.4fr) repeat(${weeks}, minmax(74px,1fr)) minmax(86px,1fr)`;

  const rowTotal = (id: string) => table[id].reduce((a, b) => a + b, 0);
  const groupWeek = (ids: string[], w: number) =>
    ids.reduce((sum, id) => sum + table[id][w], 0);

  const expenseIds = expenseLines(cats).map((c) => c.id);
  const movementIds = cashMovementLines(cats).map((c) => c.id);

  return (
    <div className={`${CARD} overflow-x-auto`}>
      <div className="min-w-[620px]">
        <div
          className="grid gap-2 px-4 py-2.5 border-b border-border bg-surface rounded-t-xl"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={LABEL}>Category</div>
          {Array.from({ length: weeks }, (_, w) => (
            <div key={w} className={`${LABEL} text-right`}>
              Wk {w + 1}
            </div>
          ))}
          <div className={`${LABEL} text-right`}>Total</div>
        </div>

        {cats.map((c, i) => (
          <div
            key={c.id}
            className={`grid gap-2 px-4 py-2.5 border-b border-border items-center ${
              c.kind === "cash-movement" ? "bg-surface/50" : ""
            }`}
            style={{ gridTemplateColumns: cols }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`${mono.className} text-[11px] text-ink-subtle w-4 shrink-0`}>
                {i + 1}
              </span>
              <span className="text-[13px] text-ink truncate">{c.label}</span>
            </div>
            {table[c.id].map((amount, w) => (
              <Cell key={w} value={amount} />
            ))}
            <Cell value={rowTotal(c.id)} strong />
          </div>
        ))}

        {/* SUBTOTALS */}
        <div
          className="grid gap-2 px-4 py-2.5 border-b border-border bg-amber-muted/50"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={`${syne.className} text-[12px] font-bold text-ink`}>
            Expenses
          </div>
          {Array.from({ length: weeks }, (_, w) => (
            <Cell key={w} value={groupWeek(expenseIds, w)} strong />
          ))}
          <Cell value={expenseIds.reduce((s, id) => s + rowTotal(id), 0)} strong />
        </div>

        <div
          className="grid gap-2 px-4 py-2.5 border-b border-border bg-surface"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={`${syne.className} text-[12px] font-bold text-ink-muted`}>
            Cash movements
          </div>
          {Array.from({ length: weeks }, (_, w) => (
            <Cell key={w} value={groupWeek(movementIds, w)} />
          ))}
          <Cell value={movementIds.reduce((s, id) => s + rowTotal(id), 0)} strong />
        </div>

        <div
          className="grid gap-2 px-4 py-3 bg-ink rounded-b-xl"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={`${syne.className} text-[12px] font-bold text-white`}>
            Weekly total
          </div>
          {Array.from({ length: weeks }, (_, w) => (
            <div
              key={w}
              className={`${mono.className} text-right text-[12px] text-white`}
            >
              {formatNaira(groupWeek([...expenseIds, ...movementIds], w))}
            </div>
          ))}
          <div className={`${mono.className} text-right text-[12px] text-amber`}>
            {formatNaira(cats.reduce((s, c) => s + rowTotal(c.id), 0))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** All branches: categories against branches, which is the comparison view. */
function ByBranch({
  year,
  month,
  branches,
}: {
  year: number;
  month: number;
  branches: Branch[];
}) {
  const ledger = useLedger();
  const tables = branches.map((b) => ({
    branch: b,
    table: categoryByWeek(ledger, b.id, year, month),
  }));
  const cats = categoriesForMonth(ledger, year, month);
  const cols = `minmax(150px,1.4fr) repeat(${branches.length}, minmax(88px,1fr)) minmax(92px,1fr)`;

  const total = (table: Record<string, number[]>, id: string) =>
    table[id].reduce((a, b) => a + b, 0);

  return (
    <div className={`${CARD} overflow-x-auto`}>
      <div style={{ minWidth: 260 + branches.length * 100 }}>
        <div
          className="grid gap-2 px-4 py-2.5 border-b border-border bg-surface rounded-t-xl"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={LABEL}>Category</div>
          {branches.map((b) => (
            <div key={b.id} className={`${LABEL} text-right`}>
              {b.short}
            </div>
          ))}
          <div className={`${LABEL} text-right`}>Total</div>
        </div>

        {cats.map((c, i) => {
          const across = tables.map(({ table }) => total(table, c.id));
          return (
            <div
              key={c.id}
              className={`grid gap-2 px-4 py-2.5 border-b border-border items-center ${
                c.kind === "cash-movement" ? "bg-surface/50" : ""
              }`}
              style={{ gridTemplateColumns: cols }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`${mono.className} text-[11px] text-ink-subtle w-4 shrink-0`}>
                  {i + 1}
                </span>
                <span className="text-[13px] text-ink truncate">{c.label}</span>
              </div>
              {across.map((amount, idx) => (
                <Cell key={idx} value={amount} />
              ))}
              <Cell value={across.reduce((a, b) => a + b, 0)} strong />
            </div>
          );
        })}

        <div
          className="grid gap-2 px-4 py-3 bg-ink rounded-b-xl"
          style={{ gridTemplateColumns: cols }}
        >
          <div className={`${syne.className} text-[12px] font-bold text-white`}>
            Total
          </div>
          {branches.map((b) => (
            <div
              key={b.id}
              className={`${mono.className} text-right text-[12px] text-white`}
            >
              {formatNaira(branchMonth(ledger, b.id, year, month).total)}
            </div>
          ))}
          <div className={`${mono.className} text-right text-[12px] text-amber`}>
            {formatNaira(
              branches.reduce(
                (s, b) => s + branchMonth(ledger, b.id, year, month).total,
                0
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Salary, typed once a month per branch, as the bottom of the paper sheet has it. */
function SalaryRow({
  year,
  month,
  branches,
}: {
  year: number;
  month: number;
  branches: Branch[];
}) {
  const ledger = useLedger();
  const user = useCurrentUser();
  const key = monthKey(year, month);
  const firstDay = dateKey(year, month, 1);
  const locked = isLocked(firstDay);
  const readOnly = locked || !can(user, "edit-book");

  return (
    <div className={`${CARD} p-4 mt-4`}>
      <div className={`${syne.className} text-sm font-bold text-ink mb-1`}>
        Salary
      </div>
      <div className="text-[11px] text-ink-subtle mb-3">
        Paid once a month and set centrally, so it is entered here rather than
        in the daily book.
      </div>
      {readOnly && (
        <div className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-muted">
          <Lock className="w-3.5 h-3.5" />
          {locked
            ? `Closed — this month could be changed until ${sentenceDate(editDeadline(firstDay))}.`
            : "Read only for your account."}
        </div>
      )}

      <div className="space-y-2">
        {branches.map((b) => (
          <div key={`${key}|${b.id}`} className="flex items-center gap-3">
            <div className="flex-1 text-sm text-ink">{b.short}</div>
            <div className="relative">
              <span
                className={`${mono.className} absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-subtle`}
              >
                ₦
              </span>
              <input
                inputMode="numeric"
                aria-label={`${b.short} salary`}
                defaultValue={ledger.salaries[`${key}|${b.id}`] || ""}
                disabled={readOnly}
                onBlur={(e) => saveSalary(key, b.id, parseAmount(e.target.value))}
                placeholder={readOnly ? "" : "0"}
                className={`${mono.className} w-[150px] h-11 pl-7 pr-3 text-base text-right rounded-lg border border-border bg-surface-raised outline-none focus:border-amber disabled:bg-surface disabled:text-ink-muted disabled:cursor-not-allowed`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MonthlySummary() {
  const ledger = useLedger();
  const [year, setYear] = useState(DEMO_YEAR);
  const [month, setMonth] = useState(DEMO_MONTH);
  const branches = branchesForMonth(useBranches(), ledger, year, month);
  const [picked, setBranchId] = useState<string>("all");
  const branchId = branches.some((b) => b.id === picked) ? picked : "all";
  const shown = branchId === "all" ? branches : branches.filter((b) => b.id === branchId);

  const months = shown.map((b) => branchMonth(ledger, b.id, year, month));

  const sum = months.reduce(
    (a, m) => ({
      revenue: a.revenue + m.revenue,
      operating: a.operating + m.operating,
      cashMovement: a.cashMovement + m.cashMovement,
      salary: a.salary + m.salary,
    }),
    { revenue: 0, operating: 0, cashMovement: 0, salary: 0 }
  );
  const profit = sum.revenue - sum.operating - sum.salary;

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
        <Figure label="Revenue" value={formatNaira(sum.revenue)} />
        <Figure
          label="Running costs"
          value={formatNaira(sum.operating)}
          hint="Loan and withdrawals left out"
        />
        <Figure label="Salary" value={formatNaira(sum.salary)} />
        <Figure
          label="After costs"
          value={formatNaira(profit)}
          tone={profit < 0 ? "bad" : "good"}
          hint="Revenue less costs and salary"
        />
      </div>

      {branchId === "all" ? (
        <ByBranch year={year} month={month} branches={branches} />
      ) : (
        <ByWeek branchId={branchId} year={year} month={month} />
      )}

      <SalaryRow year={year} month={month} branches={shown} />

      {sum.cashMovement > 0 && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-amber-muted border border-amber-border text-[12px] text-ink-secondary">
          <span className="font-semibold">
            {formatNaira(sum.cashMovement)}
          </span>{" "}
          of this month&apos;s book is loan and withdrawals. The paper form adds
          it to expenses, which makes the branch look like it spent more than it
          did — it is left out of &quot;running costs&quot; above and shown on
          its own line in the table.
        </div>
      )}
    </div>
  );
}
