# Batch 3: Layout Redesign

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 9: Create `theme-toggle.tsx` Component

**Depends on:** Task 2 (needs ThemeProvider configured)
**Can parallelize with:** Tasks 10, 11

**Files:**
- Create: `src/components/custom/theme-toggle.tsx`

**Context:** A button that toggles between dark and light mode using `next-themes`' `useTheme()` hook. It shows a sun icon when in dark mode (click to switch to light) and a moon icon when in light mode (click to switch to dark). Used in the desktop sidebar and on the profile page.

**Step 1: Create the component**

Create `src/components/custom/theme-toggle.tsx`:

```tsx
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <SunIcon className="size-5 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
      <MoonIcon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/custom/theme-toggle.tsx
git commit -m "feat(ui): add ThemeToggle component"
```

---

## Task 10: Create `mobile-nav.tsx` Component

**Depends on:** Nothing (uses built-in TanStack Router `<Link>`)
**Can parallelize with:** Tasks 9, 11

**Files:**
- Create: `src/components/custom/mobile-nav.tsx`

**Context:** Fixed bottom navigation bar for mobile (< 768px). Shows 5 tabs: Home, Transactions, Products, Recurring, Profile. Each tab has an icon and a label. The active tab is highlighted using TanStack Router's `useLocation()`. This component is only rendered on mobile (the parent `_app.tsx` uses `md:hidden` to hide it on desktop).

**Step 1: Create the component**

Create `src/components/custom/mobile-nav.tsx`:

```tsx
import { Link, useLocation } from "@tanstack/react-router";
import {
  HomeIcon,
  ReceiptTextIcon,
  PackageIcon,
  RepeatIcon,
  UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/dashboard", icon: HomeIcon },
  { label: "Transactions", href: "/dashboard/transactions", icon: ReceiptTextIcon },
  { label: "Products", href: "/dashboard/products", icon: PackageIcon },
  { label: "Recurring", href: "/dashboard/recurring", icon: RepeatIcon },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
] as const;

export function MobileNav() {
  const location = useLocation();

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    }
    return location.pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/custom/mobile-nav.tsx
git commit -m "feat(ui): add MobileNav bottom navigation component"
```

---

## Task 11: Create `desktop-sidebar.tsx` Component

**Depends on:** Task 9 (uses `ThemeToggle`)
**Can parallelize with:** Task 10

**Files:**
- Create: `src/components/custom/desktop-sidebar.tsx`

**Context:** Fixed sidebar for desktop (>= 768px). Shows navigation links with icons and text, user info at the bottom, a theme toggle, and a sign-out button. Uses the `useAuth()` hook for user info and `authClient.signOut()` for sign-out. The active link is highlighted using `useLocation()`.

**Step 1: Create the component**

Create `src/components/custom/desktop-sidebar.tsx`:

```tsx
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  HomeIcon,
  ReceiptTextIcon,
  PackageIcon,
  RepeatIcon,
  UserIcon,
  LogOutIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/auth.provider";
import { authClient } from "@/features/auth/auth-client";
import { ThemeToggle } from "./theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Home", href: "/dashboard", icon: HomeIcon },
  { label: "Transactions", href: "/dashboard/transactions", icon: ReceiptTextIcon },
  { label: "Products", href: "/dashboard/products", icon: PackageIcon },
  { label: "Recurring", href: "/dashboard/recurring", icon: RepeatIcon },
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
] as const;

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  function isActive(href: string): boolean {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/dashboard/";
    }
    return location.pathname.startsWith(href);
  }

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/" });
  }

  return (
    <aside className="flex flex-col w-60 border-r bg-background h-screen sticky top-0">
      {/* App title */}
      <div className="p-4">
        <h2 className="text-lg font-semibold tracking-tight">Expenses</h2>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* User info + actions */}
      <div className="p-4 space-y-3">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
              <AvatarFallback>
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium truncate">{user.name}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOutIcon className="size-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/components/custom/desktop-sidebar.tsx
git commit -m "feat(ui): add DesktopSidebar navigation component"
```

---

## Task 12: Rewrite `_app.tsx` Layout

**Depends on:** Tasks 10, 11 (needs MobileNav and DesktopSidebar)
**Can parallelize with:** Nothing

**Files:**
- Modify: `src/routes/_app.tsx` (complete rewrite of `AppLayout` function, lines 46-76)

**Context:** The current layout is a single centered column with a bottom row of `<Button>` nav links. The rewrite splits into two layouts: desktop shows a sidebar + content area; mobile shows content + bottom nav bar. The layout uses CSS `hidden`/`md:flex` classes for responsive switching — no JavaScript-based breakpoint detection needed here.

The existing `AuthProvider`, `OfflineBanner`, route `beforeLoad` auth guard, and `links` array will be preserved (though `links` becomes unused and should be removed). The `Outlet` component renders child routes.

**Step 1: Rewrite `_app.tsx`**

Replace the entire content of `src/routes/_app.tsx` with:

```tsx
import { AuthProvider } from "@/features/auth/auth.provider";
import { OfflineBanner } from "@/components/custom/offline-banner";
import { getSession } from "@/features/auth/auth.utils";
import { MobileNav } from "@/components/custom/mobile-nav";
import { DesktopSidebar } from "@/components/custom/desktop-sidebar";
import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    return { user: session.user };
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <OfflineBanner />
      <div className="min-h-screen bg-background">
        {/* Desktop: sidebar + content */}
        <div className="hidden md:flex">
          <DesktopSidebar />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-3xl">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile: content + bottom nav */}
        <div className="md:hidden flex flex-col min-h-screen">
          <main className="flex-1 p-4 pb-20">
            <Outlet />
          </main>
          <MobileNav />
        </div>
      </div>
    </AuthProvider>
  );
}
```

**Key changes from current `_app.tsx`:**
- Removed: `links` array, `Button` import, `Link` import, `useLocation` import, old nav bar
- Added: `MobileNav`, `DesktopSidebar` imports
- Layout: responsive split with `hidden md:flex` / `md:hidden`
- Mobile: `pb-20` adds padding-bottom so content doesn't hide behind the fixed bottom nav (which is `h-16` = 4rem)
- Desktop: content area is `max-w-3xl` centered (approx 768px)

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 3: Manual verification**

Start the dev server (`npm run dev`) and:
1. Open the app at desktop width (>= 768px) — verify sidebar appears on the left with nav links
2. Resize to mobile width (< 768px) — verify sidebar disappears and bottom nav appears
3. Click nav items — verify they navigate to correct pages and the active state highlights correctly
4. Verify sign-out button works in the sidebar
5. Verify theme toggle switches between dark and light mode

**Step 4: Commit**

```bash
git add src/routes/_app.tsx
git commit -m "feat(layout): rewrite app layout with responsive sidebar and mobile bottom nav"
```
