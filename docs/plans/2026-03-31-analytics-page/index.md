# Analytics Page Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Implement the analytics page with summary cards, 3 charts (daily spending, spending by tag, top products), tag filtering, and period comparison — all using existing backend data composed client-side.

**Architecture:** Zero backend changes. Fetch transactions, products (with tags), and tags from existing endpoints. Enrich transactions with tag data client-side by building a `Map<productId, Tag[]>` from the products response. Pure utility functions handle all data transformations (filtering, grouping, metrics computation). A custom hook orchestrates data fetching + computation via `useSuspenseQuery` (critical data) and `useQuery` (comparison data). Leaf chart components receive pre-computed data arrays and render using Recharts via shadcn's `chart` wrapper.

**Tech Stack:** React 19, TanStack Router (search params), TanStack React Query (data fetching), Recharts (via shadcn `chart` component), Tailwind CSS v4, shadcn/ui, dayjs, Vitest

**Design Document:** [`.opencode/designs/analytics-page-design.md`](../../../.opencode/designs/analytics-page-design.md)

---

## Tasks

| # | Task | Summary | Batch |
|---|------|---------|-------|
| 1 | Install shadcn chart | Run `npx shadcn@latest add chart` to install Recharts + chart wrapper | batch-01 |
| 2 | Analytics types | Create `analytics.types.ts` with all TypeScript type definitions | batch-01 |
| 3 | Analytics utils + tests | Create `analytics.utils.ts` (pure functions) + `analytics.utils.test.ts` (TDD) | batch-01 |
| 4 | Route updates | Update search schema, loaderDeps, loader, add errorComponent | batch-02 |
| 5 | MonthSelect preserve params | Update MonthSelect to preserve other search params when navigating | batch-02 |
| 6 | Analytics data hook | Create `use-analytics-data.ts` custom hook | batch-02 |
| 7 | SummaryCard component | Create single metric card with optional delta indicator | batch-03 |
| 8 | SummaryCards grid | Create cards grid that computes and displays all 6 metrics | batch-03 |
| 9 | AnalyticsFilters component | Extract filter bar (tag comboboxes + comparison select) | batch-03 |
| 10 | DailySpendingChart | Create daily spending bar chart with comparison overlay | batch-03 |
| 11 | SpendingByTagChart | Create spending by tag donut chart | batch-03 |
| 12 | TopProductsChart | Create top products horizontal bar chart | batch-03 |
| 13 | AnalyticsContent + route wiring | Create orchestrator component, wire into route | batch-04 |

## Batches

| Batch | Tasks | Depends On |
|-------|-------|------------|
| batch-01 | 1, 2, 3 | — |
| batch-02 | 4, 5, 6 | batch-01 |
| batch-03 | 7, 8, 9, 10, 11, 12 | batch-01 (types), batch-02 (hook) |
| batch-04 | 13 | batch-01, batch-02, batch-03 |

> **Note:** Batch status is NOT tracked in this table. Filenames are the single source of truth
> for lifecycle state. Run `/plan-status` to see current state.

**Parallel Execution Notes:**
- batch-01: Task 1 is independent. Task 2 is independent. Task 3 depends on Task 2.
- batch-02: Task 4 and Task 5 are independent. Task 6 depends on Task 4.
- batch-03: Tasks 7–12 are ALL independent of each other — can run in parallel.
- batch-04: Task 13 depends on all previous batches.

## Task Dependencies

| Task | Depends On | Can Parallelize With |
|------|------------|----------------------|
| 1 | — | 2 |
| 2 | — | 1 |
| 3 | 2 | 1 |
| 4 | — | 5 |
| 5 | — | 4 |
| 6 | 2, 3, 4 | 5 |
| 7 | 2 | 8, 9, 10, 11, 12 |
| 8 | 2, 7 | 9, 10, 11, 12 |
| 9 | 2 | 7, 8, 10, 11, 12 |
| 10 | 1, 2 | 7, 8, 9, 11, 12 |
| 11 | 1, 2 | 7, 8, 9, 10, 12 |
| 12 | 1, 2 | 7, 8, 9, 10, 11 |
| 13 | 6, 7, 8, 9, 10, 11, 12 | — |

## Key Codebase Context

**Result pattern:** All services return `Result<Error, Data>` which is `[err, null] | [null, data]`. When using `useSuspenseQuery`, destructure as: `const { data: [err, result] } = useSuspenseQuery(...)`.

**Transaction.price is a string:** The database stores `numeric(10, 2)` which Drizzle returns as `string`. Always use `parseFloat(transaction.price)` when doing math.

**Month indexing is 0-based:** January = 0, December = 11 (dayjs convention). All month values in URL params and query functions use this convention.

**TransactionWithProduct:** `{ transaction: Transaction; product: Product | null }` — the `product` here is `Product` (no tags). Tags come from a separate `productQueries.getProductsOptions()` call which returns `ProductWithTags[]`.

**Import alias:** `@/` maps to `./src/` (configured in tsconfig.json).

**Test runner:** `vitest run` (no globals, import `describe/it/expect` from `vitest`). Environment is `node`.

**Testing scope note:** Component tests for SummaryCard and AnalyticsFilters are explicitly deferred — the utils unit tests (Task 3) provide the primary automated coverage. Manual verification steps in Task 13 (batch-04) provide component-level validation.
