"use client";

/**
 * The chart of accounts: the lines of the expense form.
 *
 * Admins can add, rename, reorder and archive lines; everyone else reads it.
 * What a line can never do is change its id or its kind — see the note at the
 * top of lib/accounting.ts. Renaming relabels the line everywhere, closed
 * months included; the figures do not move. Archiving takes a line off Enter
 * day but keeps it in every month it has figures for.
 */

import { useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  CircleAlert,
  Link2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Category, CategoryKind, cashMovementLines, expenseLines } from "@/lib/accounting";
import {
  addCategory,
  moveCategory,
  resetLedger,
  setCategoryArchived,
  updateCategory,
  useLedger,
} from "@/lib/store";
import { can, resetDirectory, useBranches, useCurrentUser } from "@/lib/directory";
import {
  CARD,
  Field,
  FormMessage,
  INPUT,
  LABEL,
  PRIMARY,
  PageTitle,
  SECONDARY,
  mono,
  syne,
} from "@/components/shared";

type Message = { error?: string; success?: string };

const KINDS: { id: CategoryKind; label: string; description: string }[] = [
  {
    id: "expense",
    label: "Expense",
    description: "Money the branch spent. Counts in running costs.",
  },
  {
    id: "cash-movement",
    label: "Cash movement",
    description: "Money lent or taken out. In the day's total, not in running costs.",
  },
];

function Badges({ category }: { category: Category }) {
  if (!category.requiresNote && !category.reconcilesWith) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {category.requiresNote && (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-muted text-amber-hover border border-amber-border">
          <CircleAlert className="w-3 h-3" />
          Note required
        </span>
      )}
      {category.reconcilesWith && (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-surface text-ink-muted border border-border">
          <Link2 className="w-3 h-3" />
          {category.reconcilesWith}
        </span>
      )}
    </span>
  );
}

/** Name, hint, statement and the note rule — shared by adding and editing. */
function LineFields({
  label,
  hint,
  reconcilesWith,
  requiresNote,
  onChange,
}: {
  label: string;
  hint: string;
  reconcilesWith: string;
  requiresNote: boolean;
  onChange: (
    patch: Partial<{ label: string; hint: string; reconcilesWith: string; requiresNote: boolean }>
  ) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" hint="As it reads on the paper form.">
        <input
          value={label}
          onChange={(e) => onChange({ label: e.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="Hint" hint="Optional. One line under the name on Enter day.">
        <input
          value={hint}
          onChange={(e) => onChange({ hint: e.target.value })}
          className={INPUT}
        />
      </Field>
      <Field label="Checks against" hint="Optional. A statement this line can be matched to.">
        <input
          value={reconcilesWith}
          onChange={(e) => onChange({ reconcilesWith: e.target.value })}
          placeholder="e.g. Moniepoint statement"
          className={INPUT}
        />
      </Field>
      <label className="flex items-start gap-3 sm:pt-7 cursor-pointer">
        <input
          type="checkbox"
          checked={requiresNote}
          onChange={(e) => onChange({ requiresNote: e.target.checked })}
          className="mt-0.5 w-5 h-5 accent-amber shrink-0"
        />
        <span>
          <span className="block text-[13px] font-medium text-ink-secondary">Needs a note</span>
          <span className="block text-[11px] text-ink-subtle">
            A day won&apos;t save with an amount here unless someone says what it was.
          </span>
        </span>
      </label>
    </div>
  );
}

function AddLine({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [fields, setFields] = useState({
    label: "",
    hint: "",
    reconcilesWith: "",
    requiresNote: false,
  });
  const [message, setMessage] = useState<Message>({});

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addCategory({ ...fields, kind });
    if (result.ok) onDone();
    else setMessage({ error: result.error });
  };

  return (
    <form onSubmit={save} className={`${CARD} p-5 mb-4 border-amber-border`}>
      <h2 className={`${syne.className} text-base font-bold text-ink`}>Add a line</h2>
      <p className="text-[13px] text-ink-muted mt-0.5 mb-5">
        It appears on Enter day for every branch straight away, at the foot of its group.
      </p>

      <div className="text-[13px] font-medium text-ink-secondary mb-1.5">What kind of line</div>
      <div role="radiogroup" className="grid gap-2 sm:grid-cols-2 mb-1.5">
        {KINDS.map((k) => {
          const on = kind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setKind(k.id)}
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
                <span className={`${syne.className} text-sm font-bold text-ink`}>{k.label}</span>
              </span>
              <span className="block text-[12px] text-ink-muted mt-1">{k.description}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-subtle mb-5">
        This can&apos;t be changed later — switching it would change every past month&apos;s
        running costs.
      </p>

      <LineFields {...fields} onChange={(patch) => setFields((f) => ({ ...f, ...patch }))} />

      <div className="mt-5 flex flex-col-reverse tny:flex-row tny:items-center gap-3">
        <div className="flex-1">
          <FormMessage {...message} />
        </div>
        <button type="button" onClick={onDone} className={SECONDARY}>
          Cancel
        </button>
        <button type="submit" className={PRIMARY}>
          <Plus className="w-4 h-4" />
          Add line
        </button>
      </div>
    </form>
  );
}

const ICON_BUTTON =
  "h-10 px-3 rounded-lg text-[13px] text-ink-secondary hover:bg-surface flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

function LineRow({
  category,
  number,
  admin,
  first,
  last,
}: {
  category: Category;
  number?: number;
  admin: boolean;
  first: boolean;
  last: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [fields, setFields] = useState({
    label: category.label,
    hint: category.hint || "",
    reconcilesWith: category.reconcilesWith || "",
    requiresNote: !!category.requiresNote,
  });
  const [message, setMessage] = useState<Message>({});

  const changed =
    fields.label.trim() !== category.label ||
    fields.hint.trim() !== (category.hint || "") ||
    fields.reconcilesWith.trim() !== (category.reconcilesWith || "") ||
    fields.requiresNote !== !!category.requiresNote;

  const summary = (
    <>
      <span className={`${mono.className} text-[12px] text-ink-subtle w-6 shrink-0 text-right`}>
        {number ?? "—"}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${category.archived ? "text-ink-muted" : "text-ink"}`}>
          {category.label}
        </span>
        {category.hint && (
          <span className="block text-[12px] text-ink-subtle">{category.hint}</span>
        )}
      </span>
      <span className="hidden tny:block shrink-0">
        <Badges category={category} />
      </span>
    </>
  );

  if (!admin) return <div className="flex items-start gap-3 px-4 py-3">{summary}</div>;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface transition cursor-pointer"
      >
        {summary}
        <ChevronDown
          className={`w-4 h-4 mt-0.5 text-ink-subtle shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 pl-13">
          {category.archived ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-ink-muted flex-1 min-w-48">
                Archived: off Enter day, still shown in months with figures on it.
              </p>
              <button
                onClick={() => setCategoryArchived(category.id, false)}
                className={SECONDARY}
              >
                <ArchiveRestore className="w-4 h-4" />
                Reopen line
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const result = updateCategory(category.id, fields);
                setMessage(result.ok ? { success: "Saved — relabelled everywhere." } : { error: result.error });
              }}
            >
              <LineFields
                {...fields}
                onChange={(patch) => {
                  setFields((f) => ({ ...f, ...patch }));
                  setMessage({});
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  disabled={first}
                  onClick={() => moveCategory(category.id, -1)}
                  className={ICON_BUTTON}
                >
                  <ArrowUp className="w-3.5 h-3.5" /> Up
                </button>
                <button
                  type="button"
                  disabled={last}
                  onClick={() => moveCategory(category.id, 1)}
                  className={ICON_BUTTON}
                >
                  <ArrowDown className="w-3.5 h-3.5" /> Down
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmArchive) return setConfirmArchive(true);
                    const result = setCategoryArchived(category.id, true);
                    setConfirmArchive(false);
                    if (!result.ok) setMessage({ error: result.error });
                  }}
                  onBlur={() => setConfirmArchive(false)}
                  className={`${ICON_BUTTON} ${
                    confirmArchive ? "!bg-cancelled-bg !text-cancelled" : ""
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {confirmArchive ? "Tap again to archive" : "Archive"}
                </button>
                <span className="flex-1" />
                <button type="submit" disabled={!changed} className={PRIMARY}>
                  Save line
                </button>
              </div>
              {(message.error || message.success) && (
                <div className="mt-3">
                  <FormMessage {...message} />
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function LineCard({
  title,
  explain,
  lines,
  startAt,
  admin,
}: {
  title: string;
  explain?: string;
  lines: Category[];
  startAt: number;
  admin: boolean;
}) {
  return (
    <div className={`${CARD} mb-4`}>
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className={`${syne.className} text-sm font-bold text-ink`}>{title}</div>
          <span className={LABEL}>{lines.length} lines</span>
        </div>
        {explain && <div className="text-[12px] text-ink-subtle mt-1">{explain}</div>}
      </div>
      <div className="divide-y divide-border">
        {lines.map((c, i) => (
          <LineRow
            key={`${c.id}|${c.label}|${c.hint}|${c.reconcilesWith}|${c.requiresNote}`}
            category={c}
            number={startAt + i}
            admin={admin}
            first={i === 0}
            last={i === lines.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPeople, setConfirmPeople] = useState(false);
  const user = useCurrentUser();
  const branches = useBranches();
  const admin = can(user, "manage-branches");
  const catAdmin = can(user, "manage-categories");
  const ledger = useLedger();
  const [adding, setAdding] = useState(false);
  const open = ledger.categories.filter((c) => !c.archived);
  const expenses = expenseLines(open);
  const movements = cashMovementLines(open);
  const archived = ledger.categories.filter((c) => c.archived);

  return (
    <div>
      <PageTitle
        title="Categories"
        subtitle={
          catAdmin
            ? "The lines of the expense form. Tap a line to rename, move or archive it."
            : "The lines of the expense form, in the paper's order."
        }
      >
        {catAdmin && !adding && (
          <button onClick={() => setAdding(true)} className={PRIMARY}>
            <Plus className="w-4 h-4" />
            Add line
          </button>
        )}
      </PageTitle>

      {adding && <AddLine onDone={() => setAdding(false)} />}

      <LineCard title="Expenses" lines={expenses} startAt={1} admin={catAdmin} />
      <LineCard
        title="Cash movements"
        explain="On the paper form these sit with the expenses. They count in the day's total, but not in running costs — the money was lent or taken out, not spent."
        lines={movements}
        startAt={expenses.length + 1}
        admin={catAdmin}
      />

      {archived.length > 0 && (
        <div className={`${CARD} mb-4`}>
          <div className="px-4 py-3 border-b border-border">
            <div className={`${syne.className} text-sm font-bold text-ink-muted`}>Archived</div>
            <div className="text-[12px] text-ink-subtle mt-1">
              Off Enter day. Still shown in any month they have figures for.
            </div>
          </div>
          <div className="divide-y divide-border">
            {archived.map((c) => (
              <LineRow key={c.id} category={c} admin={catAdmin} first last />
            ))}
          </div>
        </div>
      )}

      <div className={`${CARD} mb-4`}>
        <div className="px-4 py-3 border-b border-border">
          <div className={`${syne.className} text-sm font-bold text-ink`}>
            Paid monthly
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-ink">
          Salary
          <span className="block text-[11px] text-ink-subtle">
            Set per branch on the monthly sheet, not in the daily book.
          </span>
        </div>
      </div>

      <div className={`${CARD} mb-4`}>
        <div className="px-4 py-3 border-b border-border">
          <div className={`${syne.className} text-sm font-bold text-ink`}>
            Branches
          </div>
        </div>
        <div className="divide-y divide-border">
          {branches
            .filter((b) => b.active)
            .map((b) => (
              <div key={b.id} className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-ink">{b.name}</span>
                <span className={`${mono.className} text-[11px] text-ink-subtle`}>
                  {b.short}
                </span>
              </div>
            ))}
        </div>
        <Link
          href="/branches"
          className="px-4 py-3 border-t border-border flex items-center justify-between text-[13px] text-ink-secondary hover:bg-surface transition rounded-b-xl"
        >
          {admin ? "Add, rename or archive branches" : "See all branches"}
          <ArrowRight className="w-4 h-4 text-ink-subtle" />
        </Link>
      </div>

      {admin && (
      <div className={`${CARD} p-4`}>
        <div className={`${syne.className} text-sm font-bold text-ink mb-1`}>
          Demo data
        </div>
        <p className="text-[12px] text-ink-muted mb-3">
          Figures live in this browser while there is no accounting service to
          hold them. November 2026 is filled to the 21st with sample numbers.
        </p>
        <button
          onClick={() => {
            if (confirmReset) {
              resetLedger();
              setConfirmReset(false);
            } else setConfirmReset(true);
          }}
          onBlur={() => setConfirmReset(false)}
          className={`${syne.className} h-10 px-4 rounded-lg border text-sm font-bold flex items-center gap-2 cursor-pointer ${
            confirmReset
              ? "border-cancelled-border bg-cancelled-bg text-cancelled"
              : "border-border text-ink hover:bg-surface"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          {confirmReset ? "Tap again — this clears what you typed" : "Reset to the sample month"}
        </button>

        <button
          onClick={() => {
            if (confirmPeople) resetDirectory();
            else setConfirmPeople(true);
          }}
          onBlur={() => setConfirmPeople(false)}
          className={`${syne.className} mt-2 h-10 px-4 rounded-lg border text-sm font-bold flex items-center gap-2 cursor-pointer ${
            confirmPeople
              ? "border-cancelled-border bg-cancelled-bg text-cancelled"
              : "border-border text-ink hover:bg-surface"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          {confirmPeople
            ? "Tap again — this signs everyone out"
            : "Reset staff and branches to the demo set"}
        </button>
      </div>
      )}
    </div>
  );
}
