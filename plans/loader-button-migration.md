# Plan: Replace Buttons with LoaderButton for Async Operations

## Context

A `LoaderButton` component already exists at `src/components/custom/loader.button.tsx`. It wraps the shadcn `Button`, accepts `isLoading` and optional `loadingText`, shows a spinner, and prevents layout shift via CSS grid stacking.

**7 buttons already use `LoaderButton` correctly** (all product/tag CRUD). **6 buttons need migration** (described below).

---

## Changes Required

### 1. `src/features/transactions/components/new-transaction.form.tsx`

**Button**: "Save transaction" submit button (line 221)  
**Mutation**: `mutation` = `transactionMutations.saveTransaction()` (line 48)

**Changes**:
- Replace `Button` import with `LoaderButton` import from `@/components/custom/loader.button`
- Line 221-223: Replace `<Button type="submit" className="w-full">Save transaction</Button>` with `<LoaderButton type="submit" className="w-full" isLoading={mutation.isPending}>Save transaction</LoaderButton>`
- Keep the `Button` import if it's used elsewhere in the file (it IS used for the date picker popover trigger and dialog buttons — so keep `Button` import, just ADD `LoaderButton` import)

### 2. `src/features/transactions/components/edit-transaction.form.tsx`

**Button**: "Update transaction" submit button (line 253)  
**Mutation**: `mutation` = `transactionMutations.updateTransaction()` (line 55)

**Changes**:
- Add `LoaderButton` import from `@/components/custom/loader.button`
- Line 253-255: Replace `<Button type="submit" className="w-full">Update transaction</Button>` with `<LoaderButton type="submit" className="w-full" isLoading={mutation.isPending}>Update transaction</LoaderButton>`
- Keep `Button` import (used for date picker trigger and other UI)

### 3. `src/features/transactions/components/simple-transaction.form.tsx`

**Buttons**: "Expense" button (line 95-103) and "Income" button (line 104-112)  
**Mutation**: `mutation` = `transactionMutations.saveTransaction()` (line 20)  
Both buttons share the same mutation.

**Changes**:
- Replace `Button` import with `LoaderButton` import (Button is NOT used elsewhere in this file)
- Line 95-103: Replace `<Button onClick={...} variant="outline" className="..." type="button">` with `<LoaderButton onClick={...} variant="outline" className="..." type="button" isLoading={mutation.isPending}>`
- Line 104-112: Same replacement for Income button
- **Note**: Both buttons share one mutation, so both will show loading when either is clicked. If we want to distinguish which one is loading, we'd need to track which button was clicked. For simplicity, both show loading — this is acceptable since the operation is fast.

### 4. `src/features/auth/component/sign-in.button.tsx`

**Button**: "Sign in with GitHub" (line 5-14)  
**Async op**: `authClient.signIn.social()` — this is NOT a TanStack mutation, it's a direct async call.

**Changes**:
- Add `useState` import from React
- Add `LoaderButton` import
- Add local `const [isLoading, setIsLoading] = useState(false)` state
- Wrap the onClick handler: set `setIsLoading(true)` before the await, add try/finally to reset on error
- Replace `<button>` with `<LoaderButton isLoading={isLoading} variant="outline">`
- Note: Since `signIn.social` redirects on success, we don't need to reset loading on success.

```tsx
import { useState } from "react";
import { LoaderButton } from "@/components/custom/loader.button";
import { authClient } from "../auth-client";

export function SignInButton({ redirect }: { redirect?: string }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoaderButton
      isLoading={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          await authClient.signIn.social({
            provider: "github",
            callbackURL: redirect || "/dashboard",
          });
        } catch {
          setIsLoading(false);
        }
      }}
    >
      Sign in with GitHub
    </LoaderButton>
  );
}
```

### 5. `src/features/auth/component/sign-out.button.tsx`

**Button**: "Sign out" (line 8-22)  
**Async op**: `authClient.signOut()` — direct async call with navigation on success.

**Changes**:
- Add `useState` import
- Add `LoaderButton` import
- Add local `isLoading` state
- Replace `<button>` with `<LoaderButton isLoading={isLoading} variant="ghost">`

```tsx
import { useState } from "react";
import { LoaderButton } from "@/components/custom/loader.button";
import { authClient } from "@/features/auth/auth-client";
import { useNavigate } from "@tanstack/react-router";

export function SignOutButton() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoaderButton
      isLoading={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                navigate({ to: "/" });
              },
            },
          });
        } catch {
          setIsLoading(false);
        }
      }}
    >
      Sign out
    </LoaderButton>
  );
}
```

### 6. `src/features/products/components/link-tag.form.tsx`

**Buttons**: Tag badges that link/unlink tags (lines 82-91 and 112-122)  
**Mutations**: `linkMutation` and `unlinkMutation` (lines 27-28)

**Consideration**: These are `TagBadge` components (not `Button`), so `LoaderButton` doesn't directly apply. Options:
- **Option A (recommended)**: Disable the tag badges during mutation by passing `disabled` or a loading style. Add `pointer-events-none opacity-50` class when the respective mutation `isPending`.
- **Option B**: Leave as-is since tag link/unlink is near-instant with query invalidation providing visual feedback.

**Recommended changes** (Option A — lightweight):
- For applied tags section (line 82-91): Add `className` conditional: `className={unlinkMutation.isPending ? "cursor-pointer opacity-50 pointer-events-none" : "cursor-pointer"}`
- For available tags section (line 112-122): Add `className` conditional: `className={linkMutation.isPending ? "cursor-pointer opacity-50 pointer-events-none" : "cursor-pointer"}`

---

## Summary

| # | File | Change | Complexity |
|---|---|---|---|
| 1 | `new-transaction.form.tsx` | `Button` → `LoaderButton` + `mutation.isPending` | Low |
| 2 | `edit-transaction.form.tsx` | `Button` → `LoaderButton` + `mutation.isPending` | Low |
| 3 | `simple-transaction.form.tsx` | Both buttons → `LoaderButton` + `mutation.isPending` | Low |
| 4 | `sign-in.button.tsx` | `<button>` → `LoaderButton` + local `useState` | Medium |
| 5 | `sign-out.button.tsx` | `<button>` → `LoaderButton` + local `useState` | Medium |
| 6 | `link-tag.form.tsx` | Add disabled/opacity styling during mutation | Low |

No new components need to be created. The existing `LoaderButton` is sufficient.
