# Batch 1: Infrastructure Setup

> **Plan:** Phase 3: Full Redesign
> **Goal:** Complete visual overhaul — dark-mode-first theme, responsive layouts, skeleton loaders, standardized error handling, and consistent shadcn component usage.
> **See:** [index.md](index.md) for full architecture, dependencies, and task list

---

## Task 1: Install shadcn UI Components

**Depends on:** Nothing
**Can parallelize with:** Tasks 2, 3

**Files:**
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/sheet.tsx`

**Context:** The app already has many shadcn components installed (button, input, select, dialog, etc.). This task adds the 5 remaining components needed for Phase 3. The shadcn CLI (`npx shadcn@latest add`) handles file generation — you just need to run it and verify the files are created.

**Step 1: Install the 5 shadcn components**

Run each command:

```bash
npx shadcn@latest add skeleton
npx shadcn@latest add card
npx shadcn@latest add avatar
npx shadcn@latest add tooltip
npx shadcn@latest add sheet
```

If prompted for overwrite confirmation on any component that already exists, select "No" to skip.

**Step 2: Verify the files were created**

Check that these files now exist:
- `src/components/ui/skeleton.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/sheet.tsx`

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors (existing pre-Phase-1 errors are fine — they exist in the codebase already)

**Step 4: Commit**

```bash
git add src/components/ui/skeleton.tsx src/components/ui/card.tsx src/components/ui/avatar.tsx src/components/ui/tooltip.tsx src/components/ui/sheet.tsx
git commit -m "feat(ui): add skeleton, card, avatar, tooltip, sheet shadcn components"
```

---

## Task 2: Configure ThemeProvider in `__root.tsx`

**Depends on:** Nothing
**Can parallelize with:** Tasks 1, 3

**Files:**
- Create: `src/lib/theme.ts`
- Modify: `src/routes/__root.tsx:66-91` (the `RootDocument` function)

**Context:** `next-themes` is already installed (`package.json` has `"next-themes": "^0.4.6"`). We need to wrap the app in a `ThemeProvider` with `attribute="class"`, `defaultTheme="dark"`, and `enableSystem={false}`. This goes inside the `<body>` tag in `RootDocument`, wrapping `{children}`.

All imports of `next-themes` throughout the app go through `src/lib/theme.ts` — never import `next-themes` directly from route/component files.

**Step 1: Create `src/lib/theme.ts`**

Create `src/lib/theme.ts`:

```ts
export { ThemeProvider, useTheme } from "next-themes";
```

This re-export centralizes the dependency so future changes (e.g., swapping theme libraries) only require updating one file.

**Step 2: Add ThemeProvider import and wrap children**

Modify `src/routes/__root.tsx`. Add the import at the top with the other imports:

```tsx
import { ThemeProvider } from "@/lib/theme";
```

Then update the `RootDocument` function body. Replace the current `<body>` contents:

```tsx
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
          <ReloadPrompt />
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
```

**Key changes:**
1. Import from `@/lib/theme` (NOT directly from `next-themes`)
2. Added `suppressHydrationWarning` to `<html>` tag (required by `next-themes` to avoid hydration mismatch on the `class` attribute)
3. Wrapped `{children}`, `<Toaster />`, and `<ReloadPrompt />` in `<ThemeProvider>`
4. `TanStackDevtools` and `<Scripts />` stay **outside** the ThemeProvider (they don't need theme context)

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

**Step 4: Manual verification**

Start the dev server (`npm run dev`) and:
1. Open the app in a browser
2. Open DevTools → Elements panel
3. Verify the `<html>` element has `class="dark"` applied
4. The page should appear with dark background colors

**Step 5: Commit**

```bash
git add src/lib/theme.ts src/routes/__root.tsx
git commit -m "feat(theme): add theme re-export module and ThemeProvider with dark mode default"
```

---

## Task 3: Update `styles.css` Dark Mode Defaults

**Depends on:** Nothing
**Can parallelize with:** Tasks 1, 2

**Files:**
- Modify: `src/styles.css:65-132` (`:root` and `.dark` blocks)

**Context:** Currently `:root` has light mode variables and `.dark` has dark mode variables. Since dark mode is the default theme, we swap them: `:root` gets the dark values, `.dark` is renamed to `.light`, and the `@custom-variant` line is updated.

The existing Tailwind v4 setup uses `@custom-variant dark (&:is(.dark *));` which means dark styles are applied when the `.dark` class is on an ancestor. With `next-themes` setting `class="dark"` on `<html>` by default, the current setup already works. However, to be correct, we need a `.light` variant so `next-themes` can toggle to light mode.

**Step 1: Update the CSS file**

Replace the `@custom-variant`, `:root`, and `.dark` blocks in `src/styles.css` (lines 6, 65-132).

Change line 6 from:
```css
@custom-variant dark (&:is(.dark *));
```
to:
```css
@custom-variant dark (&:is(.dark *));
@custom-variant light (&:is(.light *));
```

Then swap the CSS variable blocks. Replace the `:root` block (lines 65-98) with the dark mode values, and the `.dark` block (lines 100-132) becomes `.light` with the light mode values:

```css
:root {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

.light {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

**Important:** Keep the `.dark` class as well (copy of `:root` values) for the `@custom-variant dark` to still function when `next-themes` adds `class="dark"`. The `.dark` block should be identical to `:root`:

<!-- WHY `.dark` duplicates `:root`:
  Tailwind v4's `@custom-variant dark (&:is(.dark *))` only activates when
  a `.dark` class is present on an ancestor. `next-themes` toggles between
  class="dark" and class="light" on <html>. Without the explicit `.dark`
  block, removing the `.light` class would revert to `:root` values (correct)
  but `@custom-variant dark` selectors would have no `.dark` ancestor to
  match against. The duplication ensures both the CSS-variable layer AND the
  Tailwind variant layer agree when dark mode is active. -->

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

The final file should have the structure: `@imports` → `@custom-variant dark` → `@custom-variant light` → `body {}` → `code {}` → `@theme inline {}` → `:root { /* dark values */ }` → `.light { /* light values */ }` → `.dark { /* dark values, same as :root */ }` → `@layer base {}`.

**Step 2: Manual verification**

Start the dev server and confirm:
1. The app loads with a dark background by default
2. No visual regressions compared to the current dark mode appearance

**Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat(theme): make dark mode the CSS default, add light mode class"
```
