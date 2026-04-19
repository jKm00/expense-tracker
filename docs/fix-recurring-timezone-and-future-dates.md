# Fix: Recurring Timezone Offset & Future-Dated Items

## Bug 1: Date offset on UPDATE (timezone issue)

### Root Cause

The `start` and `end` columns use `timestamp` (without timezone) in both schemas:
- `apps/web/src/features/recurring/recurring.schema.ts:26-27`
- `apps/job/src/db/schemas/recurring.schema.ts:26-27`

When the Calendar component selects a date (e.g. April 19), it creates a JS `Date` at **midnight local time** (`2025-04-19T00:00:00+02:00` for Norway UTC+2). This is `2025-04-18T22:00:00Z` in UTC.

**On CREATE**: The `z.date()` validator in `createRecurringSchema` (`apps/web/src/features/recurring/recurring.dtos.ts:20`) receives a `Date` object directly from the form (client-side), and TanStack Start serializes it correctly through the server function boundary.

**On UPDATE**: The same date goes through `updateRecurringSchema` (`recurring.dtos.ts:38`), but when the form data is serialized over the network to the server function, the `Date` object is converted to an ISO string (`"2025-04-18T22:00:00.000Z"`). The `z.date()` validator then parses this ISO string back into a `Date` — but now the server sees `April 18 22:00 UTC`. When Drizzle writes this `timestamp` (without timezone) column, it stores `2025-04-18 22:00:00` — which is April 18, not April 19.

The same issue exists for CREATE but is masked because `new Date()` default (line 66 of `new-recurring.form.tsx`) typically has enough hours of buffer. The real problem is that `timestamp` without timezone stores the UTC representation, and the job reads it back as-if it were a local date.

### Fix

Normalize all dates to **noon UTC** on the selected calendar day. This ensures that regardless of timezone, the date portion is always correct when stored and read back.

#### File: `apps/web/src/features/recurring/recurring.dtos.ts`

Add a helper and use `z.coerce.date().transform()`:

```ts
// apps/web/src/features/recurring/recurring.dtos.ts

import z from "zod";
import { recurringIntervals } from "./recurring.models";
import { entryTypes } from "../transactions/transactions.models";
import { positiveNumberValidator } from "@/validators";

/**
 * Normalizes a Date to noon UTC on the same calendar day (local time).
 * This prevents timezone offsets from shifting the stored date by ±1 day.
 *
 * Example: User in UTC+2 picks April 19 → Date is 2025-04-19T00:00:00+02:00
 *          → which is 2025-04-18T22:00:00Z
 *          → we extract year/month/day from LOCAL time (April 19)
 *          → return new Date("2025-04-19T12:00:00Z")
 */
function normalizeToNoonUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
  );
}

const dateToNoonUTC = z.coerce.date().transform(normalizeToNoonUTC);

export const getRecurringSchema = z.object({
  recurringId: z.string(),
});

export type GetRecurringDTO = z.infer<typeof getRecurringSchema>;

export const createRecurringSchema = z.object({
  product: z.object({
    id: z.string().nullable(),
    name: z.string(),
  }),
  price: positiveNumberValidator,
  interval: z.enum(recurringIntervals),
  type: z.enum(entryTypes),
  start: dateToNoonUTC,
  end: dateToNoonUTC.optional(),
  isActive: z.boolean(),
});

export type CreateRecurringDTO = z.infer<typeof createRecurringSchema>;

export const updateRecurringSchema = z.object({
  recurringId: z.string(),
  product: z
    .object({
      id: z.string().nullable(),
      name: z.string(),
    })
    .optional(),
  price: positiveNumberValidator.optional(),
  interval: z.enum(recurringIntervals).optional(),
  type: z.enum(entryTypes).optional(),
  start: dateToNoonUTC.optional(),
  end: dateToNoonUTC.nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateRecurringDTO = z.infer<typeof updateRecurringSchema>;

export const deleteRecurringSchema = z.object({
  recurringId: z.string(),
});

export type DeleteRecurringDTO = z.infer<typeof deleteRecurringSchema>;
```

> **IMPORTANT**: `z.coerce.date()` is needed instead of `z.date()` because when the data crosses the server function boundary, dates are serialized as ISO strings. `z.coerce.date()` handles both `Date` objects and ISO strings.

> **NOTE on `normalizeToNoonUTC`**: This function uses `date.getFullYear()`, `date.getMonth()`, `date.getDate()` — these are **local time** getters. This is correct because the `Date` object was created on the **client** (browser) where local time = user's timezone. The transform runs in the Zod validator which executes on the **server** via the TanStack Start server function. If the server is in UTC, then `date.getFullYear()` etc. would return UTC values. Since the ISO string `2025-04-18T22:00:00.000Z` would give `getDate() = 18` on a UTC server, we need to be careful.
>
> **Safer approach** — use `getUTCFullYear/getUTCMonth/getUTCDate` but add the timezone offset back. Actually, the simplest robust fix is to use `startOfDay` from `date-fns` with explicit UTC handling. But the cleanest approach for this codebase:

**Revised `normalizeToNoonUTC`** (handles server-side execution in UTC):

```ts
/**
 * The date arrives as an ISO string from the client, e.g. "2025-04-18T22:00:00.000Z"
 * (which represents April 19 midnight in UTC+2).
 *
 * Since we can't know the user's timezone on the server, the fix should happen
 * on the CLIENT side before sending.
 */
```

Actually, let me reconsider the architecture. The Zod validator with `inputValidator` runs on the **server**. By the time it runs, the Date has been serialized to an ISO string and the local timezone info is lost. So we need to normalize **on the client** before sending.

#### Revised Fix: Normalize on the client side in the form components

**File: `apps/web/src/features/recurring/components/new-recurring.form.tsx:198-199`**

Change the Calendar `onSelect` for start date:

```tsx
// OLD (line 198-199):
setValue("start", date || new Date());

// NEW:
setValue("start", date ? normalizeToNoonUTC(date) : normalizeToNoonUTC(new Date()));
```

**File: `apps/web/src/features/recurring/components/new-recurring.form.tsx:233-234`**

Change the Calendar `onSelect` for end date:

```tsx
// OLD (line 233-234):
setValue("end", date || undefined);

// NEW:
setValue("end", date ? normalizeToNoonUTC(date) : undefined);
```

**File: `apps/web/src/features/recurring/components/new-recurring.form.tsx:66-67`**

Change the default start date:

```tsx
// OLD (line 66-67):
start: new Date(),

// NEW:
start: normalizeToNoonUTC(new Date()),
```

**File: `apps/web/src/features/recurring/components/edit-recurring.form.tsx:75-76`**

Change the default values for start/end:

```tsx
// OLD (line 75-76):
start: new Date(recurring.start),
end: recurring.end ? new Date(recurring.end) : undefined,

// NEW:
start: normalizeToNoonUTC(new Date(recurring.start)),
end: recurring.end ? normalizeToNoonUTC(new Date(recurring.end)) : undefined,
```

**File: `apps/web/src/features/recurring/components/edit-recurring.form.tsx:222-226`**

Change the Calendar `onSelect` for start date:

```tsx
// OLD (line 222-226):
onSelect={(date) => {
  setValue("start", date || new Date(), {
    shouldDirty: true,
  });
  setStartDateOpen(false);
}}

// NEW:
onSelect={(date) => {
  setValue("start", date ? normalizeToNoonUTC(date) : normalizeToNoonUTC(new Date()), {
    shouldDirty: true,
  });
  setStartDateOpen(false);
}}
```

**File: `apps/web/src/features/recurring/components/edit-recurring.form.tsx:260-264`**

Change the Calendar `onSelect` for end date:

```tsx
// OLD (line 260-264):
onSelect={(date) => {
  setValue("end", (date ?? null) as CreateRecurringDTO["end"], {
    shouldDirty: true,
  });
  setEndDateOpen(false);
}}

// NEW:
onSelect={(date) => {
  setValue("end", (date ? normalizeToNoonUTC(date) : null) as CreateRecurringDTO["end"], {
    shouldDirty: true,
  });
  setEndDateOpen(false);
}}
```

#### Shared helper location

Create a utility function that both forms import:

**New file: `apps/web/src/utils/date.ts`**

```ts
/**
 * Normalizes a Date to noon UTC on the same calendar day (in the user's local timezone).
 * This prevents timezone offsets from shifting the stored date by ±1 day.
 *
 * Example: User in UTC+2 picks April 19 → JS Date is 2025-04-19T00:00:00+02:00
 *          → getFullYear()=2025, getMonth()=3, getDate()=19 (local time)
 *          → returns new Date("2025-04-19T12:00:00Z")
 */
export function normalizeToNoonUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)
  );
}
```

Both form files should import:
```ts
import { normalizeToNoonUTC } from "@/utils/date";
```

#### Also update the DTO schema to use `z.coerce.date()`

Even though the normalization happens client-side, the server still receives an ISO string that `z.date()` may reject. Change in `apps/web/src/features/recurring/recurring.dtos.ts`:

```ts
// Replace all z.date() with z.coerce.date()
// Line 20: start: z.date()        → start: z.coerce.date()
// Line 21: end: z.date().optional() → end: z.coerce.date().optional()
// Line 38: start: z.date().optional() → start: z.coerce.date().optional()
// Line 39: end: z.date().nullable().optional() → end: z.coerce.date().nullable().optional()
```

---

## Bug 2: Future-dated recurring items skip their first day

### Root Cause

In `apps/job/src/process-recurring.ts:79`, the WHERE clause filters with:

```ts
lte(recurring.start, todayStart),  // start <= today
```

This means: only process recurring items whose `start` date is **less than or equal to** today (start of day).

The `todayStart` is computed via `startOfDay(today)` (line 66), which gives `2025-04-25T00:00:00Z` (midnight UTC).

If the recurring item's `start` is stored as `2025-04-25T12:00:00` (noon UTC, from our fix above), then `start <= todayStart` evaluates to `2025-04-25T12:00:00 <= 2025-04-25T00:00:00` → **FALSE**. The item is excluded.

Even without the noon-UTC fix, if `start` is stored as `2025-04-25T00:00:00`, then `start <= todayStart` is `2025-04-25T00:00:00 <= 2025-04-25T00:00:00` → **TRUE** (equal). So the current code should work for exact midnight matches.

But the real issue is the combination: `startOfDay` produces midnight, and the stored date might be at any time during the day. The `shouldFireOnDate` function then checks if the day-of-month matches, which it does.

**The actual bug**: With the noon-UTC fix, `start` = noon and `todayStart` = midnight, so `lte` fails on the first day. Without the fix, if the date was stored with a timezone offset (e.g. `2025-04-24T22:00:00` for April 25 in UTC+2), then `start` = April 24 22:00 which is `<= April 25 00:00` → TRUE, but then `shouldFireOnDate` compares `getDate(start)=24` vs `getDate(today)=25` → **FALSE**. So the item fires on the wrong day or not at all.

**The core problem**: The job should compare **dates** (calendar days), not timestamps.

### Fix

Change the job to normalize `todayStart` to noon UTC as well, and change the `lte` comparison to compare just the date portion.

**File: `apps/job/src/process-recurring.ts`**

Replace `startOfDay` usage with a noon-UTC normalization to match what the web app stores:

```ts
// OLD (line 1-11):
import {
  startOfDay,
  getDay,
  getDate,
  getMonth,
} from "date-fns";

// NEW:
import {
  getDay,
  getDate,
  getMonth,
} from "date-fns";

function toNoonUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0)
  );
}
```

Note: The job runs on a **server** (likely UTC), so we use `getUTCFullYear/getUTCMonth/getUTCDate` here (unlike the client-side helper which uses local getters).

```ts
// OLD (line 66):
const todayStart = startOfDay(today);

// NEW:
const todayStart = toNoonUTC(today);
```

This ensures that when comparing `lte(recurring.start, todayStart)`, both sides are at noon UTC, so a recurring item starting today will match (`noon <= noon` → TRUE).

**Also update `shouldFireOnDate`** to use UTC getters since all dates are now noon UTC:

```ts
// OLD (lines 27-56):
export function shouldFireOnDate(
  interval: "weekly" | "monthly" | "yearly",
  start: Date,
  today: Date,
): boolean {
  switch (interval) {
    case "weekly":
      return getDay(today) === getDay(start);
    case "monthly": {
      const startDay = getDate(start);
      const todayDay = getDate(today);
      const lastDayOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
      ).getDate();
      if (startDay > lastDayOfMonth) {
        return todayDay === lastDayOfMonth;
      }
      return todayDay === startDay;
    }
    case "yearly":
      return (
        getMonth(today) === getMonth(start) &&
        getDate(today) === getDate(start)
      );
  }
}

// NEW:
export function shouldFireOnDate(
  interval: "weekly" | "monthly" | "yearly",
  start: Date,
  today: Date,
): boolean {
  switch (interval) {
    case "weekly":
      return today.getUTCDay() === start.getUTCDay();
    case "monthly": {
      const startDay = start.getUTCDate();
      const todayDay = today.getUTCDate();
      const lastDayOfMonth = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
      ).getUTCDate();
      if (startDay > lastDayOfMonth) {
        return todayDay === lastDayOfMonth;
      }
      return todayDay === startDay;
    }
    case "yearly":
      return (
        today.getUTCMonth() === start.getUTCMonth() &&
        today.getUTCDate() === start.getUTCDate()
      );
  }
}
```

The `date-fns` imports `getDay`, `getDate`, `getMonth` can be removed entirely since we now use native UTC methods.

```ts
// NEW imports (line 1-4):
import { and, eq, lte, gte, or, isNull } from "drizzle-orm";
import type { Database } from "./db/index.js";
import { recurring } from "./db/schemas/recurring.schema.js";
import { products } from "./db/schemas/products.schema.js";
import { transactions, entries } from "./db/schemas/transactions.schema.js";
```

Remove the `date-fns` import entirely.

---

## Summary of all changes

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/src/utils/date.ts` | **NEW** — `normalizeToNoonUTC()` helper |
| 2 | `apps/web/src/features/recurring/recurring.dtos.ts` | Replace `z.date()` with `z.coerce.date()` (4 places) |
| 3 | `apps/web/src/features/recurring/components/new-recurring.form.tsx` | Wrap all date values with `normalizeToNoonUTC()` (3 places: default value line 66, start onSelect line 199, end onSelect line 234) |
| 4 | `apps/web/src/features/recurring/components/edit-recurring.form.tsx` | Wrap all date values with `normalizeToNoonUTC()` (4 places: defaultValues lines 75-76, start onSelect line 223, end onSelect line 261) |
| 5 | `apps/job/src/process-recurring.ts` | Remove `date-fns` import; add `toNoonUTC()` helper; replace `startOfDay` with `toNoonUTC`; rewrite `shouldFireOnDate` to use UTC getters |

## Testing

### Bug 1 — Manual test
1. Create a recurring item with start date April 19 (in Norway timezone)
2. Check DB: `start` column should show `2025-04-19 12:00:00`
3. Edit the recurring item, change start to April 20
4. Check DB: `start` column should show `2025-04-20 12:00:00` (not April 19)

### Bug 2 — Manual test
1. Create a recurring monthly item with start date = today (e.g. April 25)
2. Run the job: `npx tsx apps/job/src/index.ts`
3. Verify a transaction is created for today

### Bug 2 — Unit test for `shouldFireOnDate`

```ts
// apps/job/src/__tests__/process-recurring.test.ts
import { describe, it, expect } from "vitest";
import { shouldFireOnDate } from "../process-recurring.js";

function noonUTC(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

describe("shouldFireOnDate", () => {
  it("monthly: fires on same day-of-month", () => {
    const start = noonUTC(2025, 4, 25);
    const today = noonUTC(2025, 5, 25);
    expect(shouldFireOnDate("monthly", start, today)).toBe(true);
  });

  it("monthly: fires on start date itself", () => {
    const start = noonUTC(2025, 4, 25);
    const today = noonUTC(2025, 4, 25);
    expect(shouldFireOnDate("monthly", start, today)).toBe(true);
  });

  it("monthly: does not fire on different day", () => {
    const start = noonUTC(2025, 4, 25);
    const today = noonUTC(2025, 4, 26);
    expect(shouldFireOnDate("monthly", start, today)).toBe(false);
  });

  it("monthly: handles 31st in 30-day month", () => {
    const start = noonUTC(2025, 1, 31);
    const today = noonUTC(2025, 4, 30); // April has 30 days
    expect(shouldFireOnDate("monthly", start, today)).toBe(true);
  });

  it("weekly: fires on same day-of-week", () => {
    const start = noonUTC(2025, 4, 21); // Monday
    const today = noonUTC(2025, 4, 28); // Also Monday
    expect(shouldFireOnDate("weekly", start, today)).toBe(true);
  });

  it("yearly: fires on same month and day", () => {
    const start = noonUTC(2024, 4, 25);
    const today = noonUTC(2025, 4, 25);
    expect(shouldFireOnDate("yearly", start, today)).toBe(true);
  });
});
```
