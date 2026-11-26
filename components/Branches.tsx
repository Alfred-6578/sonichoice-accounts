"use client";

/**
 * The branches the books are kept for. Everyone can see the list; only an
 * admin can add, rename or archive.
 *
 * A branch is never deleted. Archiving takes it off Enter day and the tabs of
 * months it has no figures in, but any month it does have figures for still
 * shows it, so an old month's totals never change because a branch closed.
 */

import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import {
  MONTH_NAMES,
  branchMonth,
  daybook,
  formatNaira,
  isBlank,
  parseDateKey,
  todayKey,
} from "@/lib/accounting";
import { useLedger } from "@/lib/store";
import {
  Branch,
  addBranch,
  can,
  renameBranch,
  setBranchActive,
  useBranches,
  useCurrentUser,
} from "@/lib/directory";
import {
  CARD,
  DANGER,
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

function AddForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [message, setMessage] = useState<Message>({});

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addBranch({ name, short });
    if (result.ok) onDone();
    else setMessage({ error: result.error });
  };

  return (
    <form onSubmit={save} className={`${CARD} p-5 mb-4 border-amber-border`}>
      <h2 className={`${syne.className} text-base font-bold text-ink`}>Add a branch</h2>
      <p className="text-[13px] text-ink-muted mt-0.5 mb-5">
        It appears on Enter day straight away, with the same expense lines as every
        other branch.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" hint="As it should read on reports.">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Onitsha Branch"
            className={INPUT}
          />
        </Field>
        <Field label="Short name" hint="On tabs and table headings. Keep it to one word.">
          <input
            value={short}
            onChange={(e) => setShort(e.target.value)}
            placeholder="e.g. Onitsha"
            maxLength={16}
            className={INPUT}
          />
        </Field>
      </div>
      <div className="mt-5 flex flex-col-reverse tny:flex-row tny:items-center gap-3">
        <div className="flex-1">
          <FormMessage {...message} />
        </div>
        <button type="button" onClick={onDone} className={SECONDARY}>
          Cancel
        </button>
        <button type="submit" className={PRIMARY}>
          <Plus className="w-4 h-4" />
          Add branch
        </button>
      </div>
    </form>
  );
}

function BranchCard({ branch, admin }: { branch: Branch; admin: boolean }) {
  const ledger = useLedger();
  const [editing, setEditing] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [name, setName] = useState(branch.name);
  const [short, setShort] = useState(branch.short);
  const [message, setMessage] = useState<Message>({});

  /* This month so far, so an admin can see what a branch is doing before archiving it. */
  const today = todayKey();
  const now = parseDateKey(today);
  const year = now.getFullYear();
  const month = now.getMonth();
  const m = branchMonth(ledger, branch.id, year, month);
  const due = daybook(ledger, branch.id, year, month).filter((r) => r.date <= today);
  const done = due.filter((r) => !isBlank(r.entry)).length;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const result = renameBranch(branch.id, { name, short });
    if (result.ok) {
      setEditing(false);
      setMessage({});
    } else setMessage({ error: result.error });
  };

  return (
    <div className={`${CARD} flex flex-col ${branch.active ? "" : "bg-surface"}`}>
      <div className="p-5 flex-1">
        {editing ? (
          <form onSubmit={save} className="space-y-3">
            <Field label="Full name">
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
            </Field>
            <Field label="Short name">
              <input
                value={short}
                onChange={(e) => setShort(e.target.value)}
                maxLength={16}
                className={INPUT}
              />
            </Field>
            <FormMessage {...message} />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(branch.name);
                  setShort(branch.short);
                  setMessage({});
                }}
                className={`${SECONDARY} flex-1`}
              >
                Cancel
              </button>
              <button type="submit" className={`${PRIMARY} flex-1`}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`${syne.className} text-lg font-bold text-ink truncate`}>
                  {branch.short}
                </div>
                <div className="text-[13px] text-ink-muted truncate">{branch.name}</div>
              </div>
              <span
                className={`shrink-0 text-[11px] px-2 py-0.5 rounded-md border ${
                  branch.active
                    ? "bg-delivered-bg text-delivered border-delivered-border"
                    : "bg-surface text-ink-muted border-border"
                }`}
              >
                {branch.active ? "Open" : "Archived"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className={LABEL}>{MONTH_NAMES[month]} revenue</div>
                <div className={`${mono.className} text-[15px] text-ink`}>
                  {formatNaira(m.revenue)}
                </div>
              </div>
              <div>
                <div className={LABEL}>Days written up</div>
                <div className={`${mono.className} text-[15px] text-ink`}>
                  {done}
                  <span className="text-ink-subtle"> / {due.length}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-ink-subtle">
              Reference <span className={`${mono.className} text-ink-muted`}>{branch.id}</span> —
              fixed for good, so its records always find it.
            </div>
          </>
        )}
      </div>

      {!editing && admin && (
        <div className="border-t border-border p-2 flex flex-wrap gap-1">
          {admin && (
            <>
              <span className="flex-1" />
              <button
                onClick={() => setEditing(true)}
                className="h-10 px-3 rounded-lg text-[13px] text-ink-secondary hover:bg-surface flex items-center gap-1.5 transition cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </button>
              {branch.active ? (
                <button
                  onClick={() => {
                    if (!confirmArchive) return setConfirmArchive(true);
                    const result = setBranchActive(branch.id, false);
                    setConfirmArchive(false);
                    if (!result.ok) setMessage({ error: result.error });
                  }}
                  onBlur={() => setConfirmArchive(false)}
                  className={
                    confirmArchive
                      ? `${DANGER} h-10 text-[13px]`
                      : "h-10 px-3 rounded-lg text-[13px] text-ink-secondary hover:bg-surface flex items-center gap-1.5 transition cursor-pointer"
                  }
                >
                  <Archive className="w-3.5 h-3.5" />
                  {confirmArchive ? "Tap again to archive" : "Archive"}
                </button>
              ) : (
                <button
                  onClick={() => setBranchActive(branch.id, true)}
                  className="h-10 px-3 rounded-lg text-[13px] text-ink-secondary hover:bg-surface flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  Reopen
                </button>
              )}
            </>
          )}
        </div>
      )}
      {!editing && message.error && (
        <div className="px-4 pb-3">
          <FormMessage error={message.error} />
        </div>
      )}
    </div>
  );
}

export default function Branches() {
  const branches = useBranches();
  const user = useCurrentUser();
  const admin = can(user, "manage-branches");
  const [adding, setAdding] = useState(false);

  const open = branches.filter((b) => b.active);
  const archived = branches.filter((b) => !b.active);

  return (
    <div>
      <PageTitle
        title="Branches"
        subtitle={
          admin
            ? "Where the books are kept. Add a branch when one opens; archive it when it closes."
            : "Where the books are kept."
        }
      >
        {admin && !adding && (
          <button onClick={() => setAdding(true)} className={PRIMARY}>
            <Plus className="w-4 h-4" />
            Add branch
          </button>
        )}
      </PageTitle>

      {adding && <AddForm onDone={() => setAdding(false)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {open.map((b) => (
          <BranchCard key={`${b.id}|${b.name}|${b.short}`} branch={b} admin={admin} />
        ))}
      </div>

      {archived.length > 0 && (
        <>
          <div className={`${LABEL} mt-8 mb-3`}>Archived</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((b) => (
              <BranchCard key={`${b.id}|${b.name}|${b.short}`} branch={b} admin={admin} />
            ))}
          </div>
          <p className="mt-3 text-[12px] text-ink-subtle">
            Archived branches are off Enter day, but still appear in any month they have
            figures for.
          </p>
        </>
      )}
    </div>
  );
}
