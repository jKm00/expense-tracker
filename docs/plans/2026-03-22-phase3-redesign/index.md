# Phase 3: Full Redesign Implementation Plan

> **For Agent:** REQUIRED SUB-SKILL: Use executing-plans skill to implement this plan task-by-task.

**Goal:** Complete visual overhaul of the expense tracker — dark-mode-first theme, responsive mobile/desktop layouts with bottom nav + sidebar, skeleton loaders, standardized error handling, TanStack Form migration, and consistent shadcn component usage throughout.

**Architecture:** Client-side only changes — no new server functions or database modifications. The redesign rewrites all route components and extracts reusable list/form components into `features/*/components/`. The layout switches between a mobile bottom nav (< 768px) and a desktop sidebar (>= 768px) using CSS `hidden`/`md:flex`. Theme management uses `next-themes` (already a dependency). All forms use TanStack Form with Zod `onBlur` validation. Skeleton loaders replace all `<p>Loading...</p>` fallbacks.

**Tech Stack:** React 19, TanStack Start, TanStack Form, TanStack Query, next-themes, shadcn/ui (Skeleton, Card, Avatar, Tooltip, Sheet), Tailwind CSS v4, Lucide React icons, Zod

**Design Document:** `docs/design/2026-03-22-expense-tracker-todos-design.md` (Phase 3 section, lines 517-965)

---

## Tasks

| # | Task | Summary | Batch |
|---|------|---------|-------|
| 1 | Install shadcn UI components | Add `skeleton`, `card`, `avatar`, `tooltip`, `sheet` via shadcn CLI | batch-01 |
| 2 | Configure ThemeProvider in `__root.tsx` | Create `src/lib/theme.ts` re-export, wrap app with ThemeProvider (dark default, enableSystem false) | batch-01 |
| 3 | Update `styles.css` dark mode defaults | Swap `:root` and `.dark` CSS variable blocks so dark is the default | batch-01 |
| 5 | Create `page-header.tsx` component | Consistent page header with title + optional action slot | batch-02 |
| 6 | Create `empty-state.tsx` component | "No items" / error display component for empty lists and error states | batch-02 |
| 7 | Create `form-field.tsx` component | Reusable form field wrapper with label + children + spacing | batch-02 |
| 8 | Create skeleton components | `skeleton-page.tsx`, `skeleton-list.tsx`, `skeleton-form.tsx`, `skeleton-card.tsx` | batch-02 |
| 9 | Create `theme-toggle.tsx` component | Dark/light mode toggle button using `next-themes` `useTheme` | batch-03 |
| 10 | Create `mobile-nav.tsx` component | Bottom navigation bar with 5 tabs (Home, Transactions, Products, Recurring, Profile) | batch-03 |
| 11 | Create `desktop-sidebar.tsx` component | Fixed sidebar with nav links, icons, user info, sign out, and theme toggle | batch-03 |
| 12 | Rewrite `_app.tsx` layout | Responsive layout: mobile bottom nav + desktop sidebar, remove old nav | batch-03 |
| 13 | Create `error-messages.ts` utility | `getErrorMessage()` function mapping error reasons to user-friendly messages | batch-04 |
| 14 | Add `addFormValidation` to `transaction.validators.ts` | Zod schema for the add-transaction form (productName, description, price, type) | batch-04 |
| 15 | Create `add-transaction.form.tsx` component | TanStack Form for adding transactions with shadcn inputs, replacing dashboard useState | batch-04 |
| 16 | Rewrite `_app.dashboard.index.tsx` | Dashboard with balance summary cards + add-transaction form + recent transactions list | batch-04 |
| 17 | Create `transaction-list-item.tsx` component | Card-style transaction row with product name, price (color-coded), date | batch-05 |
| 18 | Create `transaction-list.tsx` component | Extracted transaction list using `TransactionListItem` + empty state | batch-05 |
| 19 | Rewrite `_app.dashboard.transactions.tsx` | Use extracted list component + skeleton loader + PageHeader | batch-05 |
| 20 | Rewrite `_app.dashboard.transactions.$id.tsx` | Skeleton loader + PageHeader + EmptyState with `getErrorMessage()` for errors | batch-05 |
| 21 | Create `product-list-item.tsx` component | Card-style product row with name + tag badges | batch-06 |
| 22 | Create `product-list.tsx` component | Extracted product list using `ProductListItem` + empty state | batch-06 |
| 23 | Rewrite `_app.dashboard.products.index.tsx` | Skeleton loader + PageHeader + "Create Product" button + extracted list | batch-06 |
| 24 | Rewrite `_app.dashboard.products.$productId.tsx` | Skeleton loader + PageHeader + EmptyState with `getErrorMessage()` for errors + FormField wrappers | batch-06 |
| 25 | Rewrite `_app.dashboard.products.new.tsx` | Skeleton loader + PageHeader + FormField wrappers | batch-06 |
| 26 | Create `recurring-list-item.tsx` component | Card-style recurring row with product name, interval badge, price, active indicator | batch-07 |
| 27 | Create `recurring-list.tsx` component | Extracted recurring list using `RecurringListItem` + empty state | batch-07 |
| 28 | Create `add-recurring.form.tsx` component | TanStack Form rewrite of the recurring new page form with FormField wrappers | batch-07 |
| 29 | Rewrite `_app.dashboard.recurring.index.tsx` | Skeleton loader + PageHeader + "Create" button + extracted list | batch-07 |
| 30 | Rewrite `_app.dashboard.recurring.$id.tsx` | Skeleton loader + PageHeader + EmptyState with `getErrorMessage()` for errors + FormField wrappers | batch-07 |
| 31 | Rewrite `_app.dashboard.recurring.new.tsx` | Use extracted `AddRecurringForm` + skeleton loader + PageHeader | batch-07 |
| 32 | Rewrite `_app.dashboard.profile.tsx` | Avatar, user info card, theme toggle, sign out button | batch-08 |
| 33 | Redesign landing page (`index.tsx`) | Dark-mode-first hero, shadcn Card + Button, PWA redirect preserved | batch-08 |

## Batches

| Batch | Tasks | Depends On |
|-------|-------|------------|
| batch-01 | 1, 2, 3 | — |
| batch-02 | 5, 6, 7, 8 | batch-01 (needs skeleton, card UI components) |
| batch-03 | 9, 10, 11, 12 | batch-01 (needs ThemeProvider), batch-02 (optional — no hard dep) |
| batch-04 | 13, 14, 15, 16 | batch-02 (needs PageHeader, FormField, skeletons), batch-03 (needs layout) |
| batch-05 | 17, 18, 19, 20 | batch-02 (needs PageHeader, EmptyState, skeletons), batch-04 (needs error util) |
| batch-06 | 21, 22, 23, 24, 25 | batch-02 (needs PageHeader, EmptyState, skeletons), batch-04 (needs error util) |
| batch-07 | 26, 27, 28, 29, 30, 31 | batch-02 (needs PageHeader, EmptyState, skeletons), batch-04 (needs error util) |
| batch-08 | 32, 33 | batch-01 (needs Avatar, Card), batch-03 (needs ThemeToggle) |

> **Note:** Batch status is NOT tracked in this table. Filenames are the single source of truth
> for lifecycle state. Run `/plan-status` to see current state.

**Parallel Execution Notes:**
- batch-01: All 3 tasks are independent of each other — can run in parallel
- batch-02: Tasks 5-8 are independent of each other — can run in parallel (all depend on batch-01 only)
- batch-03: Tasks 9-11 are independent; Task 12 depends on 10, 11 — run 9-11 in parallel, then 12
- batch-04: Tasks 13, 14 are independent; Task 15 depends on 14; Task 16 depends on 13, 15
- batch-05, batch-06, batch-07: These three batches are **fully independent** of each other — can run in parallel
- batch-08: Tasks 32 and 33 are independent of each other and of batch-05/06/07 — can run as soon as batch-03 is done (Task 33 only needs batch-01)

## Task Dependencies

| Task | Depends On | Can Parallelize With |
|------|------------|----------------------|
| 1 | — | 2, 3 |
| 2 | — | 1, 3 |
| 3 | — | 1, 2 |
| 5 | — | 6, 7, 8 |
| 6 | 1 | 5, 7, 8 |
| 7 | — | 5, 6, 8 |
| 8 | 1 | 5, 6, 7 |
| 9 | 2 | 10, 11 |
| 10 | — | 9, 11 |
| 11 | 9 | 10 |
| 12 | 10, 11 | — |
| 13 | — | 14 |
| 14 | — | 13 |
| 15 | 7, 14 | — |
| 16 | 8, 13, 15 | — |
| 17 | 1 | 18 |
| 18 | 6, 17 | — |
| 19 | 5, 8, 18 | 20 |
| 20 | 5, 6, 8, 13 | 19 |
| 21 | 1 | 22 |
| 22 | 6, 21 | — |
| 23 | 5, 8, 22 | 24, 25 |
| 24 | 5, 6, 7, 8, 13 | 23, 25 |
| 25 | 5, 7, 8 | 23, 24 |
| 26 | 1 | 27 |
| 27 | 6, 26 | — |
| 28 | 7 | 26, 27 |
| 29 | 5, 8, 27 | 30, 31 |
| 30 | 5, 6, 7, 8, 13 | 29, 31 |
| 31 | 5, 8, 28 | 29, 30 |
| 32 | 1, 9 | 33 |
| 33 | 1 | 32 |
