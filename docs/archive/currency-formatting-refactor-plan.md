# Currency Formatting Refactor Plan

## Goal

Format all financial/currency numbers in the UI with **spaces as thousand separators**, **2 decimal places**, and **optional +/- sign**.

Example: `100000000.00` → `100 000 000.00`, with sign: `+100 000 000.00` or `-100 000 000.00`

---

## Step 1: Create `formatAmount` utility

**File:** `apps/web/src/lib/format.ts` (new file)

```ts
/**
 * Formats a number with spaces as thousand separators and 2 decimal places.
 *
 * @param value - The number to format (number or numeric string)
 * @param options.sign - If true, prefix with + or - (default: false)
 * @param options.decimals - Number of decimal places (default: 2)
 * @returns Formatted string, e.g. "100 000.00" or "+100 000.00"
 */
export function formatAmount(
  value: number | string,
  options?: { sign?: boolean; decimals?: number },
): string {
  const { sign = false, decimals = 2 } = options ?? {};
  const num = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(num)) return "0.00";

  const abs = Math.abs(num);
  const formatted = abs.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  if (sign) {
    const prefix = num >= 0 ? "+" : "-";
    return `${prefix}${formatted}`;
  }

  return num < 0 ? `-${formatted}` : formatted;
}

/**
 * Shorthand: format with no decimals and no sign.
 */
export function formatAmountNoDecimals(
  value: number | string,
  options?: { sign?: boolean },
): string {
  return formatAmount(value, { ...options, decimals: 0 });
}
```

---

## Step 2: Update `analytics.constants.ts` — remove `Intl.NumberFormat` formatters

**File:** `apps/web/src/features/analytics/analytics.constants.ts:1-12`

**Current:**
```ts
export const TOP_LIMIT = 5;

export const currencyFormatter = new Intl.NumberFormat("no-NB", {
  style: "currency",
  currency: "NOK",
});

export const currencyFormatterNoDecimals = new Intl.NumberFormat("no-NB", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});
```

**Replace with:**
```ts
export const TOP_LIMIT = 5;

// currencyFormatter and currencyFormatterNoDecimals removed.
// Use formatAmount / formatAmountNoDecimals from "@/lib/format" instead.
```

---

## Step 3: Update all consumer files

### 3a. `features/analytics/components/hero-kpis.tsx`

**Lines 5, 49, 56, 63** — Replace `currencyFormatter.format(...)` with `formatAmount(...)`.

- **Import change:** Replace `import { currencyFormatter } from "@/features/analytics/analytics.constants"` → `import { formatAmount } from "@/lib/format"`
- `currencyFormatter.format(metrics.netBalance)` → `formatAmount(metrics.netBalance, { sign: true })`
- `currencyFormatter.format(metrics.totalIncome)` → `formatAmount(metrics.totalIncome)`
- `currencyFormatter.format(metrics.totalExpenses)` → `formatAmount(metrics.totalExpenses)`

### 3b. `features/analytics/components/financial-overview.tsx`

**Lines 4, 72, 79, 86** — Replace `currencyFormatterNoDecimals.format(...)` with `formatAmountNoDecimals(...)`.

- **Import change:** Replace `import { currencyFormatterNoDecimals } from "@/features/analytics/analytics.constants"` → `import { formatAmountNoDecimals } from "@/lib/format"`
- `currencyFormatterNoDecimals.format(metrics.netBalance)` → `formatAmountNoDecimals(metrics.netBalance, { sign: true })`
- `currencyFormatterNoDecimals.format(metrics.totalIncome)` → `formatAmountNoDecimals(metrics.totalIncome)`
- `currencyFormatterNoDecimals.format(metrics.totalExpenses)` → `formatAmountNoDecimals(metrics.totalExpenses)`

### 3c. `features/analytics/components/fixed-vs-variable.tsx`

**Lines 3, 16, 22, 28, 34** — Replace `currencyFormatter.format(...)` with `formatAmount(...)`.

- **Import change:** Replace `import { currencyFormatter } from "@/features/analytics/analytics.constants"` → `import { formatAmount } from "@/lib/format"`
- All 4 usages: `currencyFormatter.format(metrics.X)` → `formatAmount(metrics.X)`

### 3d. `features/analytics/components/detailed-kpis.tsx`

**Lines 5, 165, 172, 195, 220** — Replace `currencyFormatter.format(...)` with `formatAmount(...)`.

- **Import change:** Replace `import { currencyFormatter } from "@/features/analytics/analytics.constants"` → `import { formatAmount } from "@/lib/format"`
- All 4 usages: `currencyFormatter.format(...)` → `formatAmount(...)`

### 3e. `features/analytics/components/horizontal-expenses-bar-chart.tsx`

**Lines 20, 83, 90** — Replace `currencyFormatterNoDecimals.format(...)` with `formatAmountNoDecimals(...)`.

- **Import change:** Replace `import { TOP_LIMIT, currencyFormatterNoDecimals } from "@/features/analytics/analytics.constants"` → `import { TOP_LIMIT } from "@/features/analytics/analytics.constants"` + `import { formatAmountNoDecimals } from "@/lib/format"`
- Line 83: `tickFormatter={(v) => currencyFormatterNoDecimals.format(v)}` → `tickFormatter={(v) => formatAmountNoDecimals(v)}`
- Line 90: `currencyFormatterNoDecimals.format(Number(value))` → `formatAmountNoDecimals(Number(value))`

### 3f. `features/transactions/components/entry-list.tsx`

**Lines 52, 56** — Raw `.toFixed(2)` and unformatted price display.

- **Add import:** `import { formatAmount } from "@/lib/format"`
- Line 52: `{entry.quantity} x {entry.price},-` → `{entry.quantity} x {formatAmount(entry.price)},-`
- Line 56: `{(entry.quantity * Number(entry.price)).toFixed(2)},-` → `{formatAmount(entry.quantity * Number(entry.price))},-`

### 3g. `features/transactions/components/new-transaction.form.tsx`

**Lines 141, 147-148** — Raw `.toFixed(2)` with manual sign.

- **Add import:** `import { formatAmount } from "@/lib/format"`
- Line 141: `{entry.quantity} x {entry.price},-` → `{entry.quantity} x {formatAmount(entry.price)},-`
- Lines 147-148: Replace:
  ```tsx
  {entry.type === "expense" ? "-" : "+"}
  {Number(entry.price).toFixed(2)}
  ```
  With:
  ```tsx
  {formatAmount(entry.price, { sign: true })}
  ```
  Note: entries with type "expense" should show negative. If `entry.price` is always positive, negate it:
  ```tsx
  {formatAmount(
    entry.type === "expense" ? -Number(entry.price) : Number(entry.price),
    { sign: true },
  )}
  ```

### 3h. `features/transactions/components/edit-transaction.form.tsx`

**Lines 175-176** — Same pattern as new-transaction.form.tsx.

- **Add import:** `import { formatAmount } from "@/lib/format"`
- Replace:
  ```tsx
  {entry.type === "expense" ? "-" : "+"}
  {Number(entry.price).toFixed(2)}
  ```
  With:
  ```tsx
  {formatAmount(
    entry.type === "expense" ? -Number(entry.price) : Number(entry.price),
    { sign: true },
  )}
  ```

### 3i. `routes/_app/dashboard/transactions/$id/index.tsx`

**Line 146** — Raw `transaction.totalPrice` passed as string to KpiCard.

- **Add import:** `import { formatAmount } from "@/lib/format"`
- `value={transaction.totalPrice}` → `value={formatAmount(transaction.totalPrice)}`

### 3j. `features/recurring/components/recurring-list.tsx`

**Line 49** — Raw `item.price` displayed with `$` prefix.

- **Add import:** `import { formatAmount } from "@/lib/format"`
- `${item.price}/{item.interval}` → `{formatAmount(item.price)}/{item.interval}`

---

## Step 4: Clean up dead exports

After all consumers are migrated, remove `currencyFormatter` and `currencyFormatterNoDecimals` from `analytics.constants.ts` (already done in Step 2). Verify no remaining imports with a project-wide search for `currencyFormatter`.

---

## Files changed summary

| File | Action |
|---|---|
| `apps/web/src/lib/format.ts` | **NEW** — `formatAmount`, `formatAmountNoDecimals` |
| `apps/web/src/features/analytics/analytics.constants.ts` | Remove `currencyFormatter` + `currencyFormatterNoDecimals` |
| `apps/web/src/features/analytics/components/hero-kpis.tsx` | Swap to `formatAmount` |
| `apps/web/src/features/analytics/components/financial-overview.tsx` | Swap to `formatAmountNoDecimals` |
| `apps/web/src/features/analytics/components/fixed-vs-variable.tsx` | Swap to `formatAmount` |
| `apps/web/src/features/analytics/components/detailed-kpis.tsx` | Swap to `formatAmount` |
| `apps/web/src/features/analytics/components/horizontal-expenses-bar-chart.tsx` | Swap to `formatAmountNoDecimals` |
| `apps/web/src/features/transactions/components/entry-list.tsx` | Swap `.toFixed(2)` to `formatAmount` |
| `apps/web/src/features/transactions/components/new-transaction.form.tsx` | Swap `.toFixed(2)` + manual sign to `formatAmount` |
| `apps/web/src/features/transactions/components/edit-transaction.form.tsx` | Swap `.toFixed(2)` + manual sign to `formatAmount` |
| `apps/web/src/routes/_app/dashboard/transactions/$id/index.tsx` | Wrap `totalPrice` with `formatAmount` |
| `apps/web/src/features/recurring/components/recurring-list.tsx` | Wrap `item.price` with `formatAmount` |

---

## Not in scope

- `kpi-card.tsx:74` — `delta.percentage.toFixed(1)%` — This is a **percentage**, not currency. Leave as-is.
- `lib/db/seed.ts` — `.toFixed(2)` used for DB seeding, not UI display. Leave as-is.
