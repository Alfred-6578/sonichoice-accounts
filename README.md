# Sonichoice Accounts

Daily expenses and revenue for every Sonichoice branch, in one book.

Replaces three paper sheets — a daily expense grid per branch, a revenue
ledger, and a monthly per-branch roll-up — with a single daily entry that the
other two are computed from.

```bash
npm install
npm run dev     # localhost:3000
```

Sign in with one of the demo accounts listed on the sign-in page (one per
role: admin, accountant, viewer; password `sonichoice123`).

Figures, staff and branches currently live in the browser; there is no
backend yet, so sign-in shapes what each role sees but does not secure the data. See
[CLAUDE.md](CLAUDE.md) for the data model, the decisions behind it, and what
the accounting team has and has not confirmed.
