# Batch 3: App Integration

> **Plan:** Phase 2: PWA Support
> **Goal:** Add Progressive Web App capabilities so the expense tracker can be installed on mobile devices, persists query data for offline reads, and shows an offline indicator with mutation guards.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 7: Root meta tags

**Depends on:** Task 3 (manifest.json must exist)
**Can parallelize with:** Task 8, Task 10

**Files:**
- Modify: `src/routes/__root.tsx`

**Context:** The root route's `head()` function returns meta tags and links for the `<head>`. We need to add the manifest link and PWA-specific meta tags. TanStack Start injects these through the `HeadContent` component.

The current `head()` in `src/routes/__root.tsx` returns:

```ts
head: () => ({
  meta: [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: "JKM Expense Tracker" },
  ],
  links: [
    { rel: "stylesheet", href: appCss },
  ],
}),
```

**Step 1: Update the head() function**

In `src/routes/__root.tsx`, replace the existing `head` property inside `createRootRouteWithContext<MyRouterContext>()({...})` with:

```ts
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "JKM Expense Tracker",
      },
      {
        name: "theme-color",
        content: "#0a0a0a",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "apple-touch-icon",
        href: "/icons/apple-touch-icon.png",
      },
    ],
  }),
```

**What changed:**
1. Added `theme-color` meta tag (matches manifest's `theme_color`)
2. Added `apple-mobile-web-app-capable` meta tag (enables fullscreen on iOS Safari)
3. Added `apple-mobile-web-app-status-bar-style` meta tag (dark status bar on iOS)
4. Added manifest link pointing to `/manifest.json`
5. Added apple-touch-icon link pointing to `/icons/apple-touch-icon.png`

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 3: Verify in browser**

Run: `npm run dev`

1. Open `http://localhost:3000`
2. Open DevTools → Elements → `<head>`
3. Confirm these tags are present:
   - `<meta name="theme-color" content="#0a0a0a">`
   - `<link rel="manifest" href="/manifest.json">`
   - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`

Press `Ctrl+C` to stop the dev server.

**Step 4: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat(pwa): add manifest link and PWA meta tags to root head"
```

---

## Task 8: useOnlineStatus hook + offline banner component

**Depends on:** Nothing (no dependency on other tasks in this batch)
**Can parallelize with:** Task 7

**Files:**
- Create: `src/hooks/use-online-status.ts`
- Create: `src/hooks/use-online-status.test.ts`
- Create: `src/components/custom/offline-banner.tsx`

**Context:** The offline banner needs a reactive hook that tracks `navigator.onLine` and updates when the browser fires `online`/`offline` events. This hook is also used by the offline mutation guard (Task 11). The banner is a simple fixed bar at the top of the app when offline.

**Step 1: Write the hook test**

Create `src/hooks/use-online-status.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnlineStatus } from "./use-online-status";

describe("useOnlineStatus", () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    // Default to online
    Object.defineProperty(navigator, "onLine", {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      writable: true,
      configurable: true,
    });
  });

  it("returns true when browser is online", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it("returns false when browser is offline", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it("updates to false when offline event fires", () => {
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("offline"));
    });

    expect(result.current).toBe(false);
  });

  it("updates to true when online event fires", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current).toBe(true);
  });

  it("cleans up event listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useOnlineStatus());

    expect(addSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("offline", expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/use-online-status.test.ts`
Expected: FAIL — `Cannot find module './use-online-status'`

**Step 3: Implement the hook**

Create `src/hooks/use-online-status.ts`:

```ts
import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  // During SSR, assume online
  return true;
}

/**
 * Reactive hook that tracks the browser's online/offline status.
 * Uses `useSyncExternalStore` for tear-free reads — the value
 * updates synchronously when the browser fires online/offline events.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

> **Why `useSyncExternalStore` instead of `useState` + `useEffect`?** It's the React 18+ idiomatic way to subscribe to external browser state. It avoids tearing (inconsistent reads during concurrent rendering), handles SSR via `getServerSnapshot`, and is simpler code — no manual `useState`/`useEffect`/cleanup boilerplate.

**Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/use-online-status.test.ts`
Expected: All 5 tests PASS

**Step 5: Create the offline banner component**

Create `src/components/custom/offline-banner.tsx`:

```tsx
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      className="bg-yellow-600 text-white text-center text-sm py-1.5 px-4"
    >
      You're offline — viewing cached data. Some features may not work.
    </div>
  );
}
```

> **Stale-cache indicator:** The design doc requires "a subtle indicator that data may be outdated." The message "viewing cached data" fulfills this — it tells the user they're seeing persisted data, not live data. This is preferred over a separate staleness indicator because the app doesn't track individual cache ages, and offline inherently means all data is stale.

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 7: Commit**

```bash
git add src/hooks/use-online-status.ts src/hooks/use-online-status.test.ts src/components/custom/offline-banner.tsx
git commit -m "feat(pwa): add useOnlineStatus hook and OfflineBanner component"
```

---

## Task 9: Wire offline banner into app layout

**Depends on:** Task 8 (OfflineBanner component must exist)
**Can parallelize with:** Task 10

**Files:**
- Modify: `src/routes/_app.tsx`

**Context:** The `_app.tsx` route is the authenticated layout that wraps all `/dashboard/*` pages. It contains the `AppLayout` component with a nav bar. We add the `OfflineBanner` at the very top of the layout — above the page content — so it's visible on every authenticated page.

The current `AppLayout` in `src/routes/_app.tsx` renders:

```tsx
function AppLayout() {
  const location = useLocation();

  return (
    <AuthProvider>
      <div className="mx-auto relative min-h-screen" style={{ width: "min(100%, 500px)" }}>
        <Outlet />
        <nav className="absolute bottom-0 left-0 right-0">
          {/* ... nav buttons ... */}
        </nav>
      </div>
    </AuthProvider>
  );
}
```

**Step 1: Add the OfflineBanner import and render it**

In `src/routes/_app.tsx`, add this import at the top of the file with the other imports:

```ts
import { OfflineBanner } from "@/components/custom/offline-banner";
```

Then update the `AppLayout` function to include `<OfflineBanner />` as the first child inside the `<AuthProvider>`, before the main `<div>`:

```tsx
function AppLayout() {
  const location = useLocation();

  return (
    <AuthProvider>
      <OfflineBanner />
      <div
        className="mx-auto relative min-h-screen"
        style={{ width: "min(100%, 500px)" }}
      >
        <Outlet />
        <nav className="absolute bottom-0 left-0 right-0">
          <div className="flex gap-2">
            {links.map((link) => (
              <Button
                key={link.label}
                variant={
                  location.pathname === link.href ? "default" : "outline"
                }
                className="grow text-center"
                asChild
              >
                <Link to={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        </nav>
      </div>
    </AuthProvider>
  );
}
```

**What changed:** Added `<OfflineBanner />` right after `<AuthProvider>`, before the main content div. When online, it renders nothing. When offline, it shows a yellow banner at the top.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 3: Verify in browser**

Run: `npm run dev`

1. Open `http://localhost:3000/dashboard`
2. Open DevTools → Network → check "Offline" checkbox
3. The yellow banner "You're offline — viewing cached data. Some features may not work." should appear at the top
4. Uncheck "Offline" — the banner should disappear

Press `Ctrl+C` to stop the dev server.

**Step 4: Commit**

```bash
git add src/routes/_app.tsx
git commit -m "feat(pwa): wire OfflineBanner into app layout"
```

---

## Task 10: PWA standalone redirect

**Depends on:** Nothing (standalone detection is independent)
**Can parallelize with:** Task 9

**Files:**
- Modify: `src/routes/index.tsx`

**Context:** The PWA manifest sets `start_url: "/dashboard"`, so PWA users normally never hit `/`. This standalone detection is a fallback for edge cases (e.g., user manually navigates to `/` within the PWA). When the app detects it's running in standalone mode (installed PWA), it redirects to `/dashboard` — the auth guard there handles unauthenticated users.

The current `src/routes/index.tsx` looks like:

```tsx
import { SignInButton } from "@/features/auth/component/sign-in.button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.utils";

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getSession();
    return { isLoggedIn: !!session };
  },
  component: App,
});

function App() {
  const { isLoggedIn } = Route.useLoaderData();

  return (
    <div>
      <nav className="flex justify-between">
        <h1>Expense Tracker</h1>
        {isLoggedIn ? <Link to="/dashboard">Dashboard</Link> : <SignInButton />}
      </nav>
    </div>
  );
}
```

**Step 1: Add standalone detection with redirect**

Replace `src/routes/index.tsx` with:

```tsx
import { useEffect } from "react";
import { SignInButton } from "@/features/auth/component/sign-in.button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "@/features/auth/auth.utils";

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
    <div>
      <nav className="flex justify-between">
        <h1>Expense Tracker</h1>
        {isLoggedIn ? <Link to="/dashboard">Dashboard</Link> : <SignInButton />}
      </nav>
    </div>
  );
}
```

**What changed:**
1. Added `import { useEffect } from "react"`
2. Added `useNavigate` to imports from `@tanstack/react-router`
3. Added `useEffect` that checks `display-mode: standalone` (standard) and `navigator.standalone` (iOS Safari) — if either is true, navigate to `/dashboard`
4. The `/_app` route's `beforeLoad` auth guard handles unauthenticated users by redirecting to `/login`

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors.

**Step 3: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat(pwa): add standalone detection redirect on landing page"
```

**Done when:** Opening the landing page in PWA standalone mode redirects to `/dashboard`. Regular browser visitors see the landing page as before.

---

## Task 11: SW update prompt

**Depends on:** Task 4 (vite-plugin-pwa config + `src/pwa.d.ts` type declarations must exist)
**Can parallelize with:** Task 9, Task 10

**Files:**
- Create: `src/components/custom/reload-prompt.tsx`
- Modify: `src/routes/__root.tsx`

**Context:** When `vite-plugin-pwa` detects an updated service worker, the user should be prompted to reload. The `virtual:pwa-register/react` module provides a `useRegisterSW` hook that gives us `needRefresh` (boolean state) and `updateServiceWorker` (function to activate the new SW). Instead of a custom modal, we use Sonner's persistent toast — consistent with the rest of the app's notification pattern.

**Step 1: Create the ReloadPrompt component**

Create `src/components/custom/reload-prompt.tsx`:

```tsx
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useEffect } from "react";

/**
 * Registers the service worker and shows a Sonner toast when a new version
 * is available. The toast stays until the user clicks "Reload" or dismisses it.
 *
 * This component renders nothing visible — it only manages the SW lifecycle
 * and triggers toasts as side effects.
 */
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("SW registered:", swUrl);

      // Check for updates every hour
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast("App update available", {
        description: "A new version is ready. Reload to update.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
```

**Step 2: Wire ReloadPrompt into `__root.tsx`**

In `src/routes/__root.tsx`, add this import at the top of the file with the other imports:

```ts
import { ReloadPrompt } from "@/components/custom/reload-prompt";
```

Then add `<ReloadPrompt />` inside the `RootDocument` component, right after `<Toaster />`:

The current `RootDocument` in `src/routes/__root.tsx`:

```tsx
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
        <TanStackDevtools
          ...
        />
        <Scripts />
      </body>
    </html>
  );
}
```

Update it to:

```tsx
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Toaster />
        <ReloadPrompt />
        <TanStackDevtools
          ...
        />
        <Scripts />
      </body>
    </html>
  );
}
```

**What changed:**
1. Imported `ReloadPrompt` from `@/components/custom/reload-prompt`
2. Added `<ReloadPrompt />` after `<Toaster />` — it must be after Toaster so Sonner is available for the toast calls

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors. The `virtual:pwa-register/react` types should resolve via `src/pwa.d.ts` (created in Task 4).

**Step 4: Commit**

```bash
git add src/components/custom/reload-prompt.tsx src/routes/__root.tsx
git commit -m "feat(pwa): add SW update prompt via ReloadPrompt component and Sonner toast"
```

**Done when:** When a new service worker is detected, a persistent Sonner toast appears with "App update available" and a "Reload" button. Clicking "Reload" activates the new SW and refreshes the page.
