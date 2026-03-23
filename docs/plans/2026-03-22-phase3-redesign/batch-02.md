# Batch 2: Shared Custom Components

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 5: Create `page-header.tsx` Component

**Depends on:** Nothing
**Can parallelize with:** Tasks 6, 7, 8

**Files:**
- Create: `src/components/custom/page-header.tsx`

**Context:** Every page in the redesign uses a consistent header with a title and an optional action button (e.g., "Create Product"). This component replaces all the ad-hoc `<h2>` titles scattered across route files.

**Step 1: Create the component**

Create `src/components/custom/page-header.tsx`:

```tsx
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/custom/page-header.tsx
git commit -m "feat(ui): add PageHeader component"
```

---

## Task 6: Create `empty-state.tsx` Component

**Depends on:** Task 1 (needs Card component)
**Can parallelize with:** Tasks 5, 7, 8

**Files:**
- Create: `src/components/custom/empty-state.tsx`

**Context:** Used for "no items found" messages on list pages and for error states on detail pages (e.g., "Transaction not found"). Takes a `message` string and an optional `icon` prop.

**Step 1: Create the component**

Create `src/components/custom/empty-state.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { InboxIcon } from "lucide-react";

export function EmptyState({
  message,
  icon: Icon = InboxIcon,
  action,
}: {
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="size-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">{message}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/custom/empty-state.tsx
git commit -m "feat(ui): add EmptyState component for empty lists and error states"
```

---

## Task 7: Create `form-field.tsx` Component

**Depends on:** Nothing
**Can parallelize with:** Tasks 5, 6, 8

**Files:**
- Create: `src/components/custom/form-field.tsx`

**Context:** A lightweight wrapper that adds consistent spacing between a label and its form input. Used in all forms to replace raw `<label>` + `<Input>` pairs. This is NOT a TanStack Form field binding — it's just a layout wrapper. The `FieldError` component remains separate and is placed inside the form field children.

**Step 1: Create the component**

Create `src/components/custom/form-field.tsx`:

```tsx
import { Label } from "@/components/ui/label";

export function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/custom/form-field.tsx
git commit -m "feat(ui): add FormField wrapper component"
```

---

## Task 8: Create Skeleton Components

**Depends on:** Task 1 (needs `skeleton.tsx` shadcn component)
**Can parallelize with:** Tasks 5, 6, 7

**Files:**
- Create: `src/components/custom/skeleton-page.tsx`
- Create: `src/components/custom/skeleton-list.tsx`
- Create: `src/components/custom/skeleton-form.tsx`
- Create: `src/components/custom/skeleton-card.tsx`

**Context:** These skeleton components replace all `<p>Loading...</p>` fallbacks throughout the app. Each approximates the layout of the real content it replaces: lists show rows, forms show input fields, cards show content blocks. They all use the shadcn `<Skeleton>` primitive (installed in Task 1).

**Step 1: Create `skeleton-card.tsx`**

Create `src/components/custom/skeleton-card.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
```

**Step 2: Create `skeleton-list.tsx`**

Create `src/components/custom/skeleton-list.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}
```

**Step 3: Create `skeleton-form.tsx`**

Create `src/components/custom/skeleton-form.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  );
}
```

**Step 4: Create `skeleton-page.tsx`**

Create `src/components/custom/skeleton-page.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonPage({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      {children ?? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 6: Commit**

```bash
git add src/components/custom/skeleton-card.tsx src/components/custom/skeleton-list.tsx src/components/custom/skeleton-form.tsx src/components/custom/skeleton-page.tsx
git commit -m "feat(ui): add skeleton components for loading states"
```
