# Add `type` Column to Recurring Product Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Add an `income` | `expense` type column to the `recurring_product` table, reusing the existing `transaction_type` pgEnum, and surface it in the UI forms and list view.

**Architecture:** The `transaction_type` pgEnum (`income`, `expense`) already exists in the database from the transactions feature. We reuse it in the `recurring_product` table by importing it from `transaction.schema.ts`. The column is `NOT NULL DEFAULT 'expense'` so existing rows are backfilled automatically. The change flows through: schema → models → validators → controller → UI forms → list item.

**Tech Stack:** Drizzle ORM, PostgreSQL, Zod, React 19, TanStack Form, shadcn/ui Select component

---

## Tasks

| # | Task | Summary | Batch |
|---|------|---------|-------|
| 1 | Schema + migration | Add `type` column to `recurringProduct` schema, generate Drizzle migration | batch-01 |
| 2 | Models | Add `RecurringType` type alias to `recurring.models.ts` | batch-01 |
| 3 | Validators | Add `type` field to `addFormValidation` and `formValidation` | batch-01 |
| 4 | Controller | Add `type` field to `NewRecurringProductSchema` and `UpdateRecurringProductSchema` | batch-01 |
| 5 | Add recurring form | Add type `Select` field to add-recurring form | batch-02 |
| 6 | Edit recurring form | Add type `Select` field to edit-recurring form | batch-02 |
| 7 | Recurring list item | Show type badge with color coding (green=income, red=expense) | batch-02 |
| 8 | Validator tests | Update existing tests and add new tests for `type` field | batch-03 |

> **Migration note:** On PostgreSQL 11+, `ALTER TABLE ... ADD COLUMN ... DEFAULT 'expense' NOT NULL` is an instant metadata-only operation for constant defaults — no table rewrite. Safe for any table size.

## Batches

| Batch | Tasks | Depends On |
|-------|-------|------------|
| batch-01 | 1, 2, 3, 4 | — |
| batch-02 | 5, 6, 7 | batch-01 |
| batch-03 | 8 | batch-01 |

> **Note:** Batch status is NOT tracked in this table. Filenames are the single source of truth
> for lifecycle state. Run `/plan-status` to see current state.

**Parallel Execution Notes:**
- batch-01: Tasks 1 must be done first (schema), then tasks 2, 3, 4 can run in parallel
- batch-02: Tasks 5, 6, 7 are independent of each other — can run in parallel
- batch-03: Task 8 only depends on batch-01 (validators) — can run in parallel with batch-02

## Task Dependencies

| Task | Depends On | Can Parallelize With |
|------|------------|----------------------|
| 1 | — | — |
| 2 | 1 | 3, 4 |
| 3 | 1 | 2, 4 |
| 4 | 1 | 2, 3 |
| 5 | 3, 4 | 6, 7 |
| 6 | 3, 4 | 5, 7 |
| 7 | 1 | 5, 6 |
| 8 | 3 | 5, 6, 7 |

## Files Changed (no changes needed)

These files use generic types/spreads that automatically pick up the new `type` column — **no modifications required:**

- `src/features/recurring/recurring.repo.ts` — uses `NewRecurringProduct` / `UpdateRecurringProduct` types + spread syntax
- `src/features/recurring/recurring.service.ts` — passes data through to repo
- `src/features/recurring/recurring.mappers.ts` — spreads `recurringProduct` object
- `src/features/recurring/recurring.mutations.ts` — uses `NewRecurringProductDTO` / `UpdateReucrringProductDTO` inferred from controller schemas
- `src/features/recurring/recurring.queries.ts` — read-only, no schema dependency
