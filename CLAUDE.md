# Sonichoice Accounts

A small web app that replaces the paper expense and revenue books kept by the
accounting department of Sonichoice Logistics, a parcel delivery business in
south-east Nigeria.

It is a **separate product** from the Sonichoice inventory system
(`~/Desktop/delivery_management`, deployed at `inventory.sonichoicelogistics.com`).
It will get its own subdomain. The two share a visual language and a branch
list, nothing else. Do not import from, or couple this to, the other project.

Status: **first working iteration, built to be shown to the accounting team so
they can say what is wrong with it.** Sign-in, roles, staff and branch
management were added on 26 Nov 2026 as a browser-only demo. The details of how they work are still
partly unknown. Expect requirements to change after they see it.

---

## The business

- Parcel delivery and merchant logistics. Merchants' goods are stocked at
  branches and delivered out daily.
- Three branches, the same three the inventory system runs on:
  **Enugu Head Office**, **Nsukka**, **Ebonyi**.
- Money is naira (₦). Amounts are whole naira; kobo is never used.
- The working week runs **Monday to Saturday**. Sunday is never written in the
  book at all.

## Who uses this

**Accounting staff**, not branch staff. They write the books up from receipts
and reports, so entry is often after the fact and may cover several days at
once. Assume desktop and phone both matter; the inventory system is mostly
used on phones and the same people move between them.

---

## The paper it replaces

Three sheets, photographed and analysed in the session that produced this app.
They are three views of one set of numbers.

### Sheet 1 — daily expense grid, one per branch per month
Titled `EXPENSES FOR NOVEMBER 2026 FOR EBONYI`.

- **Rows are days**, grouped into week blocks with a subtotal row after each:
  `1st Week` 2/11 M → 7/11 S, total; `2nd Week` 9/11 → 14/11, total; and so on.
- **Columns are the expense categories** (full list below), ending in
  `TOTAL FOR THE DAY`.
- Each cell is one branch, one day, one category.

### Sheet 2 — revenue ledger
Titled `ENUGU AND NSUKKA BRANCH - NOV`.

- `S/N`, `DATE`, then per branch: **Revenue · Expenses · Balance**.
- Same date spine, Sundays out, weekly `TOTAL 4 D WK` rows, then `GRAND TOTAL`.
- The Expenses column is Sheet 1's "total for the day" copied across.
- This is the sheet management actually reads.

### Sheet 3 — monthly roll-up
Titled `EXPENSES FOR NOVEMBER 2026 PER BRANCH`.

- Transposed: **categories numbered down the left**, and across the top each
  branch gets `WK1`–`WK5` plus a `TOTAL`, with a grand total column at the end.
- Bottom rows: `WEEKLY TOTAL`, `SALARY`, `GRAND TOTAL`.
- Salary appears only here — it is monthly and set centrally.

### The categories, in the paper's own order

| # | Line | Notes |
|---|---|---|
| 1 | Merchant's waybill | waybill paid on a merchant's goods |
| 2 | Internal branch waybill | waybill between our own branches |
| 3 | Staff airtime | |
| 4 | Fuel | |
| 5 | Transport for deliveries | written "TP for deliveries" on paper |
| 6 | Stationaries | their spelling; keep it |
| 7 | Gate pass | |
| 8 | Bike maintenance | |
| 9 | POS charge | reconciles against the **Moniepoint** statement |
| 10 | NEPA / maintenance | electricity and general upkeep |
| 11 | Staff welfare support | |
| 12 | Tips for phone | |
| 13 | Mechanic | |
| 14 | Others | catch-all |
| 15 | Loan | **cash movement, not an expense** |
| 16 | Withdrawals | **cash movement, not an expense** |

Plus **Salary**, monthly and per branch, entered on the monthly sheet.

---

## What the accounting team confirmed

Asked and answered, so do not re-ask:

1. **Accounting staff** fill the book, not branch staff.
2. **Revenue is cash received from completed deliveries** — money already
   collected, not billed or owed.
3. **Balance = revenue − expenses for that day.** Not a running float carried
   forward.
4. **Same three branches as the inventory system, and the same category list
   at every branch.**
5. They use a **Moniepoint POS**, and the POS charge line comes off it.

## Still unknown — ask them, do not guess

- Whether they agree loan and withdrawals should be held apart from expenses
  (see the decision below — this is the one most worth their reaction).
- Whether a month should be signed off and locked, and who signs it.
- Whether anyone other than accounting needs to see it, and at what level.
- Whether revenue could be derived from the inventory system's delivery data
  instead of typed.
- Whether the three roles (decision 8) match how the department is actually
  split, and who should hold Admin.
- Whether the one-week edit window (decision 7) is the right length, and
  whether anyone — an admin, the accountant in charge — needs to reopen a
  closed month for a late correction.

---

## Decisions made, and why

These are deliberate departures from the paper. Each should survive being
questioned, or be reversed on purpose — not drifted away from.

1. **One input, two views.** The only thing anybody types is an amount against
   (branch, date, category) plus the day's revenue. The day book and the
   monthly sheet are sums of that. Nothing is ever entered twice. This alone
   removes most of the copying error in the paper process.

2. **Loan and Withdrawals are tagged `cash-movement`, not `expense`.** They are
   money lent out or taken out, not money the business consumed. They are still
   added into "Total for the day" so the figure matches their book, but
   "Running costs" excludes them, and they get their own group on the entry
   screen and their own row on the monthly sheet.

3. **Salary lives outside the daily grid**, entered per branch per month on the
   monthly sheet — which is where the paper has it too.

4. **"Others" will not save without a note.** On paper it is a number; in
   software, without a note it becomes the biggest column nobody can explain.

5. **Unrecorded days are visible.** On paper a day nobody wrote up looks the
   same as a day with no spend. The app flags and counts them, and the CSV
   export carries a `Recorded: yes/no` column.

6. **Week blocks close on Saturday.** A block runs to the first Saturday of the
   month and then in sevens. November 2026 comes out as 2-7, 9-14, 16-21,
   23-28, 30 — the five blocks on their sheet, 25 working days. A month opening
   mid-week (December 2026) keeps its short first block rather than swallowing
   eleven days into week 1. Verified against Nov 2026, Dec 2026, Feb 2027 and
   May 2027.

7. **A month can be edited until seven days after it ends, then it is closed
   to everybody.** *Dev note:* November 2026 is editable through 7 December
   and closed from 8 December — the rule is `today > lastDayOfMonth + 7`,
   compared as `YYYY-MM-DD` strings in the user's local time. It lives in
   `lib/accounting.ts` (`EDIT_GRACE_DAYS`, `editDeadline`, `isLocked`) and is
   enforced twice: the screens go read-only (Enter day, salary on the monthly
   sheet), and `saveEntry` / `saveSalary` in `lib/store.ts` refuse the write
   regardless. Admins are not exempt; there is no reopen. It covers salary
   too, keyed off the month's first day. When a backend exists the check
   must move server-side and use the server's date — today a user can dodge it
   by changing their device clock. Asked for by the product owner on
   26 Nov 2026; the length is not yet confirmed with the accounting team.

8. **Three roles.** Admin (everything, plus Staff and Branches), Accountant
   (enters days and salary, reads all books), Viewer (reads and exports,
   changes nothing). Permissions live in `GRANTS` in `lib/directory.ts`;
   check them with `can(user, permission)`, never by comparing role names.
   Nav links a role cannot use are hidden, not shown and refused. Staff are
   switched off, never deleted, so `recordedBy` on old entries still names a
   real person; the last active admin cannot be demoted or switched off.

9. **Branches are data, not a constant.** Managed on /branches by admins. A
   branch's `id` is permanent — every entry and salary is keyed by it — so
   renaming changes `name` / `short` only. Branches are archived, never
   deleted: archived ones leave Enter day, but `branchesForMonth` still
   includes any archived branch with figures in that month, so closing a
   branch never changes an old month's totals. Read branches with
   `useBranches()`; `SEED_BRANCHES` in `data/demo.ts` is only the first-run
   list.

10. **The expense lines are data too, kept on the Ledger** (`ledger.categories`),
    because they are the book's chart of accounts and travel with it. Admins
    add, rename, reorder and archive them on /settings. Same rules as
    branches — the `id` is permanent and lines are archived, never deleted —
    plus one more: a line's `kind` (expense or cash movement) is fixed when it
    is created, because changing it would rewrite every past month's running
    costs. Renaming relabels the line everywhere, closed months included; the
    figures do not move. New lines go at the foot of their own group, so cash
    movements stay last. Month views list lines via `categoriesForMonth`
    (open lines plus archived ones with figures that month); Enter day uses
    `categoriesForEntry`. `DEFAULT_CATEGORIES` is only the first-run list, and
    a saved book without its own list is given it when read. Agreed with the
    product owner on 26 Nov 2026.

11. **Sunday cannot be written up.** The day arrows on Enter day skip it, and a
    Sunday picked from the date picker is read-only with a nudge to Saturday or
    Monday — figures saved against a Sunday would appear in no sheet.

---

## How the code is laid out

```
app/
  layout.tsx              html, body, DM Sans, metadata
  globals.css             the Sonichoice design tokens
  login/page.tsx          Sign in         /login      (outside the shell; ?next=)
  (app)/
    layout.tsx            wraps everything in the nav shell (and its sign-in gate)
    page.tsx              Overview        /
    entry/page.tsx        Enter day       /entry      (reads ?branch=&date=)
    daybook/page.tsx      Day book        /daybook    (rows open the day)
    monthly/page.tsx      Monthly sheet   /monthly
    reports/page.tsx      Reports         /reports
    settings/page.tsx     Categories      /settings
    profile/page.tsx      Profile         /profile
    staff/page.tsx        Staff           /staff      (admins only)
    branches/page.tsx     Branches        /branches   (all read, admins change)
components/
  Shell.tsx               sidebar + mobile drawer + header; sends anyone
                          signed out to /login
  Sidebar.tsx             dark nav rail, role-filtered links, signed-in user,
                          cross-link to the inventory app
  shared.tsx              fonts, CARD/LABEL classes, MonthNav, BranchTabs,
                          Figure, PageTitle
  Overview.tsx            month at a glance, outstanding days, spend bars
  DailyEntry.tsx          the only screen anybody types into: sticky context
                          column + numbered lines on desktop, save bar on
                          phone; Enter walks the form; asks before dropping
                          unsaved figures
  DayBook.tsx             sheet 2, per branch or all three side by side
  MonthlySummary.tsx      sheet 3, by week or by branch, plus salary
  Reports.tsx             CSV export of both sheets
  Settings.tsx            chart of accounts (editable by admins), branches
                          link, demo data reset
  Profile.tsx             own details, password, what your role allows
  Staff.tsx               add people, set roles, reset passwords, switch off
  Branches.tsx            add, rename, archive branches
lib/
  accounting.ts           THE MODEL — categories, dates, week maths, totals,
                          the edit deadline. Pure: no I/O, no React.
  store.ts                where the book lives (localStorage, for now)
  directory.ts            staff, roles, branches, the session (localStorage)
  persist.ts              the localStorage + subscribe helper directory uses
  password.ts             salted SHA-256 for the demo (not real security)
data/
  demo.ts                 seed branches, demo accounts, the sample month
```

### The model, `lib/accounting.ts`

Read this first when changing anything. It holds:

- `DEFAULT_CATEGORIES`, the `expense` / `cash-movement` split, and
  `expenseLines` / `cashMovementLines` / `categoriesForMonth` /
  `categoriesForEntry` for reading the list off a ledger.
- `Entry` — one branch, one day: `{ branchId, date, revenue, amounts, notes }`,
  where `amounts` is `categoryId -> naira`. Keyed `${branchId}|${date}` so a
  day can only be recorded once.
- `Ledger` — the category list, all entries, and `salaries` keyed
  `${YYYY-MM}|${branchId}`.
- Dates as plain `YYYY-MM-DD` strings, built from local parts. **Never use
  `toISOString()` for a date key** — it shifts the day across timezones.
- `weekOfMonth`, `weeksInMonth`, `workingDays` — the week-block maths above.
- `operatingTotal` / `cashMovementTotal` (take the category list) and
  `dayTotal` / `balanceOf` (do not need it) — the two readings of a day's
  spend.
- `daybook`, `groupByWeek`, `categoryByWeek`, `branchMonth` — the aggregates
  every screen and the CSV export are built from. Add new reports here, not in
  a component.
- `formatNaira`, `formatShort`, `parseAmount`.

### The store, `lib/store.ts`

`localStorage`, under `sonichoice.accounting.v1`, exposed through
`useLedger()` (a `useSyncExternalStore` subscription), `saveEntry`,
`saveSalary`, `resetLedger`, and the admin-only `addCategory`,
`updateCategory`, `moveCategory`, `setCategoryArchived`. The two book writes
return `false` and do nothing for a closed month or an account without
`edit-book`.

### The directory, `lib/directory.ts`

Staff, branches and the session, each its own localStorage key
(`sonichoice.accounts.users.v1`, `.branches.v1`, `.session.v1`). Changes go
through functions that validate and return `{ ok } | { ok: false, error }`
with a sentence fit to show the user. `useCurrentUser()` is `undefined`
while loading and `null` when signed out — the shell waits on the first and
redirects on the second.

**Sign-in is a demo, not security.** Accounts and passwords live in the
browser; anyone with devtools can edit them. Passwords are salted SHA-256
(written out in `lib/password.ts` because `crypto.subtle` does not exist over
plain http, which is how phones reach the dev server). The demo accounts —
one per role, password `sonichoice123` — are listed on the sign-in page; that
panel goes when there is a backend.

**There is no backend yet.** No accounting API exists. That is deliberate for
now: it makes the thing demonstrable today, and every write already goes
through one module, so pointing it at a real service later is a change to this
file and nothing above it. `data/demo.ts` seeds November 2026 up to the 21st
from a fixed seed, so the same figures come up at every demo and the gaps after
the 21st show off the missing-days flag.

---

## Conventions

**Design tokens** (`app/globals.css`) — use these, never raw Tailwind colours
like `green-50` or `amber-200`:

- brand: `amber`, `amber-hover`, `amber-muted`, `amber-border`
- text: `ink`, `ink-secondary`, `ink-muted`, `ink-subtle`
- surfaces: `surface`, `surface-raised`, `border`, `border-strong`
- status: `delivered` / `transit` / `pending` / `cancelled`, each with `-bg`
  and `-border`
- extra breakpoints: `xsm:385px`, `tny:450px`, `vsm:550px`

**Type**: Syne for headings and buttons, DM Mono for every number, code and
date, DM Sans for body. Declared per file via `next/font/google`; the shared
exports are in `components/shared.tsx`.

**Mobile**: inputs must be at least 16px (`text-base`) or iOS Safari zooms on
focus. Sticky bars need `env(safe-area-inset-bottom)`. Tap targets 44px.

**React**: the lint config forbids `setState` directly inside an effect. To
reload state when a key changes, compare a stamp during render and set state
there — see the pattern at the top of `DailyEntry.tsx`. Keyed fragments must be
`<Fragment key=...>`, not `<>`.

**Comments**: explain *why*, especially where the code departs from the paper
or from the obvious approach. Do not narrate what the code plainly says.

**Money**: never float arithmetic on part-naira. Amounts are whole numbers;
`parseAmount` strips `₦` and commas and rounds.

---

## Verifying

```bash
npm run dev          # localhost:3000
npx tsc --noEmit
npx eslint .
npx next build
```

All three must be clean. For the date and week maths, write a throwaway script
that imports `lib/accounting.ts` and prints the week blocks for several months
— that is how the Saturday rule was checked.

---

## What is not built yet

Deliberately left for after the accounting team has seen it:

- Any backend. Sign-in, roles and staff exist but only in the browser, so
  each device has its own accounts and its own book.
- Reopening a closed month (decision 7 has no override on purpose).
- PDF output for printing (CSV export exists).
- Any tie between the revenue figure and real delivery data.
