# Batch 8: Profile Redesign

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 32: Rewrite `_app.dashboard.profile.tsx`

**Depends on:** Task 1 (needs Avatar component), Task 9 (needs ThemeToggle component)
**Can parallelize with:** Nothing (only task in this batch)

**Files:**
- Modify: `src/routes/_app.dashboard.profile.tsx` (complete rewrite)

**Context:** The current profile page is minimal — a raw `<img>` for the avatar, a bare `<p>` for the name, and the `SignOutButton`. The rewrite uses:

- `Avatar` + `AvatarImage` + `AvatarFallback` (from shadcn — installed in Task 1) for the user image
- `Card` for layout grouping
- `ThemeToggle` (created in Task 9) for dark/light mode switching
- `PageHeader` for consistent title
- The existing `SignOutButton` (at `src/features/auth/component/sign-out.button.tsx`) for sign out — but styled as a `Button` variant

The `useAuth()` hook (from `src/features/auth/auth.provider.tsx`) provides:
- `user.name` — display name (string)
- `user.email` — email address (string)
- `user.image` — avatar URL (string | null)

The existing `SignOutButton` uses a raw `<button>` element. The rewrite passes it through as-is — no changes to `SignOutButton` itself. Instead, we wrap it in our own styled button within the profile page.

Actually, looking at `SignOutButton` more carefully, it renders a plain `<button>` — we should use it as-is since it handles the sign-out logic, but style the page to make the button look good. We'll use the `Button` component from shadcn with `variant="destructive"` as a separate sign-out trigger that calls `authClient.signOut()` directly, keeping it simple.

Since `SignOutButton` is a standalone component that already works, the simplest approach is to keep using it but have the profile page provide its own styled version. We'll create an inline styled version right in the profile route.

**Step 1: Rewrite the profile route**

Replace the entire content of `src/routes/_app.dashboard.profile.tsx` with:

```tsx
import { useAuth } from "@/features/auth/auth.provider";
import { authClient } from "@/features/auth/auth-client";
import { PageHeader } from "@/components/custom/page-header";
import { ThemeToggle } from "@/components/custom/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOutIcon } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
        },
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" />

      {/* User Info Card */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="size-16">
            {user?.image && (
              <AvatarImage src={user.image} alt={user.name ?? "User"} />
            )}
            <AvatarFallback className="text-lg">
              {user?.name ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">
              {user?.name ?? "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Switch between dark and light mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOutIcon className="size-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Key changes from current file:**
- Replaced raw `<img>` with shadcn `Avatar` + `AvatarImage` + `AvatarFallback` (shows initials when no image)
- Added `PageHeader` for consistency
- Wrapped user info in a `Card`
- Added a "Preferences" card with `ThemeToggle` for dark/light mode switching
- Replaced `SignOutButton` import with inline sign-out using shadcn `Button` variant="destructive" (calls `authClient.signOut()` directly — same logic as `SignOutButton` but styled)
- Added email display

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server and:
1. Navigate to `/dashboard/profile` — verify Avatar with user image (or initials fallback)
2. Verify user name and email display
3. Click the theme toggle — verify dark/light mode switches
4. Click "Sign Out" — verify redirect to landing page

**Step 4: Commit**

```bash
git add src/routes/_app.dashboard.profile.tsx
git commit -m "feat(profile): redesign profile page with Avatar, ThemeToggle, and Card layout"
```

---

## Task 33: Redesign Landing Page (`index.tsx`)

**Depends on:** Task 1 (needs Card component)
**Can parallelize with:** Task 32

**Files:**
- Modify: `src/routes/index.tsx` (complete rewrite — dark-mode-first, shadcn components)

**Context:** The current landing page (`src/routes/index.tsx`) is ~38 lines with raw `<div>/<nav>/<h1>` and minimal styling. The design doc specifies this page should be redesigned with dark-mode-first styling and shadcn components. It needs to:

1. Keep the existing PWA standalone detection + auto-redirect logic
2. Keep the `getSession()` loader for login state detection
3. Use shadcn `Button` and `Card` components for styling
4. Add a proper hero section with the app title + description
5. Show "Go to Dashboard" button if logged in, or a styled sign-in button if not

The existing `SignInButton` component uses `authClient.signIn.social()` — we'll continue using it but wrap it in shadcn styling.

**Step 1: Rewrite the landing page route**

Replace the entire content of `src/routes/index.tsx` with:

```tsx
import { useEffect } from "react";
import { SignInButton } from "@/features/auth/component/sign-in.button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WalletIcon, ArrowRightIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getSession();
    return { isLoggedIn: !!session };
  },
  component: App,
});

function App() {
  const { isLoggedIn } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      // In PWA mode, always redirect away from landing page.
      // If logged in → dashboard. If not → /login (auth guard handles it).
      navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Hero */}
        <div className="space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary">
            <WalletIcon className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Expense Tracker
          </h1>
          <p className="text-muted-foreground">
            Track your income, expenses, and recurring transactions in one
            place.
          </p>
        </div>

        {/* Action card */}
        <Card>
          <CardContent className="pt-6">
            {isLoggedIn ? (
              <Button asChild className="w-full" size="lg">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            ) : (
              <SignInButton />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

**Note:** The `SignInButton` component currently renders a raw `<button>`. For full visual consistency, you may want to update `SignInButton` to accept a `className` prop or use shadcn's `Button` component internally — but that's a separate concern outside this plan's scope. The landing page will still function correctly with the current `SignInButton`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server and:
1. Navigate to `/` — verify dark background, centered hero with wallet icon, app title, description
2. If logged out — verify sign-in button appears inside a Card
3. If logged in — verify "Go to Dashboard" button appears and navigates correctly
4. Resize to mobile — verify responsive layout
5. Open in PWA standalone mode — verify auto-redirect to dashboard

**Step 4: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat(landing): redesign landing page with dark-mode-first hero and shadcn components"
```
