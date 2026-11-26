"use client";

/** Pieces the three accounting screens share: type, card chrome, pickers. */

import { DM_Mono, Syne } from "next/font/google";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { MONTH_NAMES, parseDateKey } from "@/lib/accounting";
import { roleLabel, type Branch, type Role } from "@/lib/directory";

export const syne = Syne({ subsets: ["latin"] });
export const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"] });

export const CARD =
  "bg-surface-raised border border-border rounded-xl shadow-[0_1px_2px_rgba(17,24,39,0.04)]";
/** "Mon 7 Dec 2026" — for deadlines and dates written in a sentence. */
export const sentenceDate = (date: string) =>
  parseDateKey(date).toLocaleDateString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const LABEL = "text-[11px] uppercase tracking-wider text-ink-subtle";

/* Buttons. Dark text on amber: white on this amber is about 2:1 and hard to read. */
export const PRIMARY = `${syne.className} h-11 px-5 rounded-lg bg-amber text-ink text-sm font-bold flex items-center justify-center gap-2 transition hover:bg-amber-hover cursor-pointer disabled:bg-border disabled:text-ink-subtle disabled:cursor-not-allowed`;
export const SECONDARY = `${syne.className} h-11 px-4 rounded-lg border border-border bg-surface-raised text-sm font-bold text-ink flex items-center justify-center gap-2 transition hover:bg-surface cursor-pointer disabled:text-ink-subtle disabled:cursor-not-allowed`;
export const DANGER = `${syne.className} h-11 px-4 rounded-lg border border-cancelled-border bg-cancelled-bg text-sm font-bold text-cancelled flex items-center justify-center gap-2 transition hover:opacity-90 cursor-pointer`;

/* text-base, not smaller: iOS Safari zooms the page on focus below 16px. */
export const INPUT =
  "w-full h-11 px-3 text-base rounded-lg border border-border bg-surface-raised text-ink outline-none transition focus:border-amber focus:ring-2 focus:ring-amber-border disabled:bg-surface disabled:text-ink-muted";

/** Initials in a circle — there are no photos to show. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const box = { sm: "w-9 h-9 text-[12px]", md: "w-10 h-10 text-[13px]", lg: "w-16 h-16 text-xl" }[size];
  return (
    <span
      aria-hidden
      className={`${syne.className} ${box} shrink-0 rounded-full bg-amber-muted border border-amber-border text-amber-hover font-bold flex items-center justify-center`}
    >
      {initials || "?"}
    </span>
  );
}

/** A role, as a small tag. */
export function RoleBadge({ role }: { role: Role }) {
  const tone = {
    admin: "bg-ink text-surface-raised border-ink",
    accountant: "bg-amber-muted text-amber-hover border-amber-border",
    viewer: "bg-surface text-ink-muted border-border",
  }[role];
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${tone}`}>
      {roleLabel(role)}
    </span>
  );
}

/** A labelled form field. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-secondary mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-ink-subtle mt-1">{hint}</span>}
    </label>
  );
}

/** A one-line message under a form: what went wrong, or that it worked. */
export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`text-[13px] px-3 py-2 rounded-lg border ${
        error
          ? "bg-cancelled-bg text-cancelled border-cancelled-border"
          : "bg-delivered-bg text-delivered border-delivered-border"
      }`}
    >
      {error || success}
    </div>
  );
}

/** Shown in place of a page someone's role does not reach. */
export function NoAccess({ what }: { what: string }) {
  return (
    <div className={`${CARD} px-6 py-12 text-center`}>
      <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-surface border border-border flex items-center justify-center">
        <Lock className="w-4.5 h-4.5 text-ink-muted" />
      </div>
      <div className={`${syne.className} text-base font-bold text-ink`}>Admins only</div>
      <p className="text-sm text-ink-muted mt-1">
        Only an admin can manage {what}. Ask one if something here needs changing.
      </p>
    </div>
  );
}

/** Previous / next month, with the month written out between them. */
export function MonthNav({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const step = (by: number) => {
    const d = new Date(year, month + by, 1);
    onChange(d.getFullYear(), d.getMonth());
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => step(-1)}
        aria-label="Previous month"
        className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-ink-muted hover:bg-surface cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div
        className={`${syne.className} min-w-[150px] text-center text-sm font-bold text-ink`}
      >
        {MONTH_NAMES[month]} {year}
      </div>
      <button
        onClick={() => step(1)}
        aria-label="Next month"
        className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-ink-muted hover:bg-surface cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/** A handful of branches, so a row of pills beats a dropdown on a phone. */
export function BranchTabs({
  branches,
  value,
  onChange,
  allLabel,
}: {
  branches: Branch[];
  value: string;
  onChange: (id: string) => void;
  /** Adds an "everything" option at the front when given. */
  allLabel?: string;
}) {
  const options = allLabel ? [{ id: "all", short: allLabel }, ...branches] : branches;

  return (
    <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl overflow-x-auto">
      {options.map((b) => (
        <button
          key={b.id}
          onClick={() => onChange(b.id)}
          className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm transition cursor-pointer ${
            value === b.id
              ? "bg-surface-raised text-ink font-semibold shadow-[0_1px_2px_rgba(17,24,39,0.06)]"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {b.short}
        </button>
      ))}
    </div>
  );
}

/** A figure with its name above it, used across the summary strips. */
export function Figure({
  label,
  value,
  tone = "ink",
  hint,
}: {
  label: string;
  value: string;
  tone?: "ink" | "good" | "bad" | "amber";
  hint?: string;
}) {
  const colour = {
    ink: "text-ink",
    good: "text-delivered",
    bad: "text-cancelled",
    amber: "text-amber-hover",
  }[tone];

  return (
    <div className="min-w-0">
      <div className={LABEL}>{label}</div>
      <div className={`${mono.className} text-lg font-medium truncate ${colour}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-subtle truncate">{hint}</div>}
    </div>
  );
}

/** Title block at the top of every accounts page. */
export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Controls that belong beside the title, such as a month picker. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col vsm:flex-row vsm:items-end vsm:justify-between gap-3 mb-5">
      <div className="min-w-0">
        <h1 className={`${syne.className} text-2xl font-bold text-ink truncate`}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
