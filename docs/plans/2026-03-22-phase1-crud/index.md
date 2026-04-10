# Phase 1: CRUD Operations Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Add missing update/delete operations for transactions and create/update/delete operations for products, completing the expense tracker's basic CRUD functionality.

**Architecture:** Feature-based hexagonal architecture. Each feature (transactions, products) follows the pattern: repo (Drizzle DB queries) → service (business logic + ownership checks) → controller (TanStack Start server functions with Zod validation) → client layer (TanStack Query options/mutations, Zod validators) → UI components (TanStack Form, AlertDialog). All server functions return `[error, data]` Result tuples.

**Tech Stack:** TanStack Start, TanStack Form, TanStack Query, Drizzle ORM, Zod, shadcn/ui (AlertDialog, Input, Select, Calendar), React 19

**Design Document:** `docs/design/2026-03-22-expense-tracker-todos-design.md` (Phase 1 section)

---

## Tasks

| # | Task | Summary | Batch |
|---|------|---------|-------|
| 1 | Transaction repo: get, update, remove | Add `get`, `update`, `remove` methods to `transactionRepo` | batch-01 |
| 2 | Transaction service: get, update, delete | Add `getTransaction`, `updateTransaction`, `deleteTransaction` with ownership checks | batch-01 |
| 3 | Transaction controller: get, update, delete | Add server functions with Zod validators for single-get, update, and delete | batch-01 |
| 4 | Transaction validators + queries + mutations | Create `transaction.validators.ts`, add `getTransactionOptions` to queries, add update/delete mutations | batch-02 |
| 5 | Edit transaction form component | TanStack Form for editing price, type, date, description | batch-02 |
| 6 | Delete transaction dialog component | AlertDialog with destructive confirm, navigates to list on success | batch-02 |
| 7 | Transaction detail route + list links | Create `$id` route page, update transactions list with `<Link>` to detail pages | batch-02 |
| 8 | Product repo: getUsage | Add `getUsage` method counting transactions and checking recurring associations | batch-03 |
| 9 | Product service: update, delete, getProductUsage | Add `updateProduct`, `deleteProduct`, `getProductUsage` with ownership checks | batch-03 |
| 10 | Product controller: create, update, delete, getProductUsage | Add four new server functions with Zod input validators | batch-03 |
| 11 | Product validators + queries + mutations | Create `product.validators.ts`, add `getProductUsageOptions`, create `product.mutations.ts` | batch-04 |
| 12 | Create product form + route | Form component and `/dashboard/products/new` route page | batch-04 |
| 13 | Edit product form component | TanStack Form for editing product name (inline on detail page) | batch-04 |
| 14 | Delete product dialog + update detail page | AlertDialog with cascade warning, wire edit form + delete into product detail route | batch-04 |

## Batches

| Batch | Tasks | Depends On |
|-------|-------|------------|
| batch-01 | 1, 2, 3 | — |
| batch-02 | 4, 5, 6, 7 | batch-01 |
| batch-03 | 8, 9, 10 | — |
| batch-04 | 11, 12, 13, 14 | batch-03 |

> **Note:** Batch status is NOT tracked in this table. Filenames are the single source of truth
> for lifecycle state. Run `/plan-status` to see current state.

**Parallel Execution Notes:**
- batch-01 and batch-03 are **fully independent** — can run in parallel
- batch-02 depends on batch-01 (transaction backend must exist before client layer + UI)
- batch-04 depends on batch-03 (product backend must exist before client layer + UI)
- After batch-01 completes, batch-02 can start immediately (even if batch-03 is still running)

## Task Dependencies

| Task | Depends On | Can Parallelize With |
|------|------------|----------------------|
| 1 | — | 8 |
| 2 | 1 | 8, 9 |
| 3 | 2 | 8, 9, 10 |
| 4 | 3 | 8, 9, 10 |
| 5 | 4 | 8, 9, 10, 11 |
| 6 | 4 | 8, 9, 10, 11 |
| 7 | 5, 6 | 8, 9, 10, 11 |
| 8 | — | 1 |
| 9 | 8 | 1, 2, 4 |
| 10 | 9 | 1, 2, 3, 4 |
| 11 | 10 | 5, 6, 7 |
| 12 | 11 | 5, 6, 7 |
| 13 | 11 | 5, 6, 7 |
| 14 | 11, 13 | 5, 6, 7 |
