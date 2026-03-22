# Expense Tracker: CRUD, PWA & Redesign

**Date:** 2026-03-22
**Status:** Approved

## Problem

The expense tracker has basic functionality but is missing essential CRUD operations (update/delete transactions and products), has no offline/PWA support, and the UI is unstyled and inconsistent — using raw HTML inputs, ad-hoc `useState` validation, and no loading/error states. The app needs to become a polished, mobile-first PWA with consistent UX patterns.

## Approach

Three-phase implementation: **CRUD → PWA → Redesign**. This order is deliberate — CRUD features add the missing functionality that the redesign will style, and PWA is a thin infrastructure layer best added before the layout overhaul. Each phase is independently shippable.

---

## Phase 1: CRUD Operations

### What's Changing

Add missing update and delete operations for transactions and products. Currently, transactions can only be created, and products can only be viewed. After this phase, users can edit transaction details (price, type, date, description) and delete transactions, as well as create/update/delete products independently.

**Scope:**
- Update transaction: price, type, date, description only (productId and source are immutable)
- Delete transaction: with confirmation dialog
- Create product: standalone (not via transaction flow)
- Update product: name only
- Delete product: with confirmation dialog

### Component Architecture

#### New Files

**Transactions:**
```
src/features/transactions/
├── transaction.validators.ts          # Zod schemas for client-side form validation
├── components/
│   ├── edit-transaction.form.tsx       # TanStack Form for editing transaction
│   └── delete-transaction.alert.tsx    # AlertDialog for delete confirmation
```

**Products:**
```
src/features/products/
├── product.validators.ts              # Zod schemas for client-side form validation
├── product.mutations.ts               # useMutation hooks for create/update/delete
├── components/
│   ├── create-product.form.tsx         # TanStack Form for creating product
│   ├── edit-product.form.tsx           # TanStack Form for editing product name
│   └── delete-product.alert.tsx        # AlertDialog for delete confirmation
```

**Routes:**
```
src/routes/
├── _app.dashboard.transactions.$id.tsx # Transaction detail/edit page (new)
├── _app.dashboard.products.new.tsx     # Create product page (new)
```

#### Modified Files

```
src/features/transactions/transaction.controller.ts  # Add updateTransaction, deleteTransaction
src/features/transactions/transaction.service.ts     # Add update, delete methods
src/features/transactions/transaction.repo.ts        # Add update, delete methods
src/features/transactions/transaction.mutations.ts   # Add update, delete mutation hooks
src/features/transactions/transaction.queries.ts     # Add getTransactionOptions (single)
src/features/products/product.controller.ts          # Add createProduct, updateProduct, deleteProduct
src/features/products/product.service.ts             # Add update, delete methods
src/routes/_app.dashboard.transactions.tsx            # Add links to transaction detail pages
src/routes/_app.dashboard.products.$productId.tsx     # Add edit form + delete dialog
```

### Data Flow

#### Transaction Update

**Server functions (controller):**

```ts
// transaction.controller.ts
const UpdateTransactionSchema = z.object({
  id: z.string(),
  price: z.number().min(0),
  type: z.enum(["expense", "income"]),
  date: z.string(),           // ISO date string "YYYY-MM-DD"
  description: z.string().optional(),
});

const updateTransaction = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(UpdateTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await transactionService.updateTransaction(userId, data.id, data);
  });
```

**Service layer:**

```ts
// transaction.service.ts
async function updateTransaction(userId: string, id: string, data: UpdateTransactionInput) {
  const existing = await transactionRepo.get(id);
  if (!existing) return err({ reason: "TRANSACTION_NOT_FOUND", message: "..." });
  if (existing.userId !== userId) return err({ reason: "TRANSACTION_FORBIDDEN", message: "..." });

  try {
    const updated = await transactionRepo.update(id, {
      price: data.price.toString(),
      type: data.type,
      date: data.date,
      description: data.description,
    });
    return ok(updated);
  } catch (error) {
    return err({ reason: "TRANSACTION_UPDATE_ERROR", error: ... });
  }
}
```

**Repo layer:**

```ts
// transaction.repo.ts
async function get(id: string) {
  return await db.select().from(transaction).where(eq(transaction.id, id)).then(r => r[0] ?? null);
}

async function update(id: string, data: Partial<Omit<NewTransaction, "id" | "userId" | "createdAt">>) {
  return (await db.update(transaction).set(data).where(eq(transaction.id, id)).returning())[0];
}

async function remove(id: string) {
  return (await db.delete(transaction).where(eq(transaction.id, id)).returning())[0];
}
```

**Mutation hooks:**

```ts
// transaction.mutations.ts
function updateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTransactionDTO) =>
      transactionController.updateTransaction({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

function deleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { id: string }) =>
      transactionController.deleteTransaction({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
```

**Query for single transaction:**

```ts
// transaction.queries.ts
function getTransactionOptions(id: string) {
  return queryOptions({
    queryKey: [QUERY_KEY, id],
    queryFn: () => transactionController.getTransaction({ data: { id } }),
  });
}
```

#### Transaction Delete

Uses the same `delete-recurring.alert.tsx` pattern: `AlertDialog` with destructive action, mutation in `onSuccess` navigates back to transactions list.

#### Product Create

**Server function:**

```ts
// product.controller.ts
const CreateProductSchema = z.object({
  name: z.string().min(1),
});

const createProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(CreateProductSchema)
  .handler(async ({ context, data }) => {
    return await productService.create(context.user.id, data.name);
  });
```

**Mutation:**

```ts
// product.mutations.ts
function createProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) =>
      productController.createProduct({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCT_QUERY_KEY] });
    },
  });
}
```

#### Product Update (name only)

```ts
// product.controller.ts
const UpdateProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

const updateProduct = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(UpdateProductSchema)
  .handler(async ({ context, data }) => {
    return await productService.updateProduct(context.user.id, data.id, { name: data.name });
  });
```

#### Product Delete

Same AlertDialog pattern as recurring delete. Service checks ownership before deletion. Navigates to products list on success.

### UX/Interaction Patterns

**Transaction detail page (`/dashboard/transactions/$id`):**
- Shows the edit form pre-populated with current values
- Product name displayed as read-only text (not editable)
- Source displayed as read-only badge
- Price, type, date, description are editable
- "Danger Zone" section at bottom with delete button (same pattern as recurring detail page)

**Transaction list (`/dashboard/transactions`):**
- Each transaction row becomes a `<Link>` to `/dashboard/transactions/$id`
- Displays: product name, price (color-coded by type), date

**Product list (`/dashboard/products`):**
- Add "Create Product" button at top (same placement as recurring's "Create" button)
- Each product row remains a link to its detail page

**Product detail (`/dashboard/products/$productId`):**
- Add inline edit form for product name (TanStack Form)
- Add "Danger Zone" section with delete dialog
- Keep existing tag management

**Create product page (`/dashboard/products/new`):**
- Simple form: name input + submit button
- On success, navigate to the new product's detail page

### Error Handling

**Pattern:** Follow the existing `Result` tuple pattern (`[error, data]`).

**Service-level errors** (used across all new operations):
- `TRANSACTION_NOT_FOUND` / `PRODUCT_NOT_FOUND` — entity doesn't exist
- `TRANSACTION_FORBIDDEN` / `PRODUCT_FORBIDDEN` — user doesn't own the entity
- `*_UPDATE_ERROR` / `*_DELETE_ERROR` / `*_CREATION_ERROR` — database operation failed

**Client-side handling:**
- Mutation `onSuccess` checks `[err, data]` tuple
- Known errors (`NOT_FOUND`, `FORBIDDEN`): display specific message via `toast()`
- Unknown/unexpected errors: `toast("Something went wrong, please try again")`
- Delete dialogs: show error toast on failure, navigate away on success

### Key Implementation Decisions

1. **Transaction edit excludes productId and source** — these are core identity fields that shouldn't change. If a user needs a different product, they delete the transaction and create a new one.

2. **Product delete cascades to transactions and recurring items** — the database schema uses `onDelete: "cascade"` on both `transaction.productId → product.id` and `recurring_product.productId → product.id` foreign keys. Deleting a product automatically deletes all associated transactions and the recurring configuration. The delete confirmation dialog must warn about this clearly. The service layer should check what will be cascade-deleted before showing the dialog:
   - If the product has transactions: "This will permanently delete the product and all **N transactions** associated with it."
   - If the product is also used in a recurring configuration: "This will permanently delete the product, all **N transactions**, and the **recurring configuration** associated with it."
   - If the product has no dependents: "This will permanently delete the product."

3. **Follow `edit-recurring.form.tsx` as the reference** — all new forms use `useForm` from `@tanstack/react-form-start`, Zod validators on `onBlur`, `<FieldError>` component, and `<LoaderButton>` for submit.

4. **No new route for transaction editing** — transaction detail page (`/dashboard/transactions/$id`) doubles as the edit page. Same pattern as recurring detail at `/dashboard/recurring/$id`.

5. **Product creation uses a dedicated page** — not a dialog, because it's a primary action that deserves focus (same pattern as `/dashboard/recurring/new`).

---

## Phase 2: PWA Support

### What's Changing

Add Progressive Web App capabilities so the app can be installed on mobile devices and has basic offline support. The PWA manifest sets `start_url` to `/dashboard`, so opening the PWA always goes directly to the dashboard. The existing auth guard on the `/_app` route handles unauthenticated users — they get redirected to `/login`, never seeing the marketing landing page. Regular browser visitors still see the landing page at `/`.

### Component Architecture

#### New Files

```
public/
├── manifest.json                    # PWA manifest
├── icons/
│   ├── icon-192x192.png
│   ├── icon-512x512.png
│   └── apple-touch-icon.png
src/
├── service-worker.ts                # Service worker for offline caching
```

#### Modified Files

```
src/routes/__root.tsx                # Add manifest link + meta tags in head()
src/routes/index.tsx                 # Add PWA standalone detection → redirect to /dashboard
vite.config.ts                       # Add service worker build config (or vite-plugin-pwa)
```

### Data Flow

No new server functions or database changes. PWA is purely a client-side infrastructure concern.

**Service worker strategy (via `vite-plugin-pwa` runtime caching):**

App shell and static assets — **CacheFirst**:
- Matches: `.html`, `.js`, `.css`, image files, fonts, icons
- These rarely change between deploys; serve from cache, update in background

TanStack server functions — **NetworkFirst**:
- Matches: URLs starting with `/_server` (TanStack Start's server function endpoint prefix)
- Tries network first; if offline, serves cached response from last successful fetch
- If no cached response exists, the query will error and the UI shows an "offline" state via the existing `[err, data]` result handling

**Offline mode is READ-ONLY:** Cached query data is shown when available. All mutations show an error toast: "You're offline. Please reconnect to save changes." No offline mutation queue — full offline sync is a separate future effort.

### UX/Interaction Patterns

**PWA detection in landing page (fallback):**

The manifest `start_url: "/dashboard"` is the primary mechanism — PWA users never hit `/` in normal use. This client-side redirect exists only as a fallback for edge cases (e.g., user navigates to `/` manually within the PWA):

```ts
// index.tsx
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

  // ... existing landing page (only shown in regular browser)
}
```

**Auth flow for PWA users:**
- PWA opens → `start_url: "/dashboard"` → `/_app` route's `beforeLoad` runs
- If authenticated → renders dashboard
- If not authenticated → existing auth guard redirects to `/login` with return URL
- After login → redirected back to `/dashboard`
- PWA users **never** see the marketing landing page at `/`

**Manifest configuration:**

```json
{
  "name": "JKM Expense Tracker",
  "short_name": "Expenses",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "icons": [...]
}
```

**Offline indicator:** A small banner at the top of the app layout when `navigator.onLine` is false: "You're offline — some features may not work."

### Error Handling

- Offline mutations: show toast "You're offline. Please reconnect to save changes."
- Stale cache: serve cached data but show a subtle indicator that data may be outdated
- Service worker update: on new version detected, show "Update available" toast with refresh action

### Key Implementation Decisions

1. **Use `vite-plugin-pwa`** — handles service worker generation, manifest injection, and update prompts. Avoids manually wiring up workbox. Configure runtime caching rules for `/_server` URLs (NetworkFirst) and static assets (CacheFirst).

2. **`start_url: "/dashboard"` is the primary PWA entry** — the manifest points directly to `/dashboard`. The existing auth guard on the `/_app` route handles unauthenticated users by redirecting to `/login`. Client-side standalone detection in `index.tsx` is a fallback only.

3. **Offline is read-only** — no offline mutation queue. If the user is offline and tries to mutate, show an error toast. This keeps complexity low; full offline sync is a separate future effort.

4. **Dark background/theme color** — uses dark mode colors for the PWA chrome since Phase 3 makes dark mode the primary theme.

### Manual Verification

After implementation, manually verify the following:

1. **Install PWA from browser** — use Chrome/Safari "Add to Home Screen" or "Install App"
2. **Open as standalone** — confirm the app opens directly to `/dashboard` (not the landing page)
3. **Logged-out PWA launch** — clear session, re-open PWA. Confirm redirect to `/login`, then after login lands on `/dashboard`
4. **Go offline** — disable network in DevTools or airplane mode. Confirm offline banner appears at top of app
5. **Mutation while offline** — try adding/editing a transaction while offline. Confirm error toast: "You're offline. Please reconnect to save changes."
6. **Reconnect** — re-enable network. Confirm offline banner disappears and data refreshes

---

## Phase 3: Full Redesign

### What's Changing

Complete visual overhaul: dark-mode-first theme, responsive mobile/desktop layouts, skeleton loaders, standardized forms with TanStack Form + Zod validation on blur, consistent error handling, and uniform shadcn component usage throughout.

### Component Architecture

#### New Files

```
src/components/custom/
├── skeleton-page.tsx                # Reusable page-level skeleton wrapper
├── skeleton-list.tsx                # Skeleton for list views
├── skeleton-form.tsx                # Skeleton for form views
├── skeleton-card.tsx                # Skeleton for card content
├── form-field.tsx                   # Reusable form field wrapper (label + input + error)
├── page-header.tsx                  # Consistent page header with title + optional action
├── empty-state.tsx                  # "No items" illustration/message component
├── offline-banner.tsx               # Offline status indicator (from Phase 2)
├── mobile-nav.tsx                   # Bottom navigation bar for mobile
├── desktop-sidebar.tsx              # Sidebar navigation for desktop
├── theme-toggle.tsx                 # Dark/light mode toggle button

src/components/ui/
├── skeleton.tsx                     # shadcn skeleton primitive (if not already present)
├── card.tsx                         # shadcn card component
├── avatar.tsx                       # shadcn avatar for profile
├── tooltip.tsx                      # shadcn tooltip for nav icons
├── sheet.tsx                        # shadcn sheet (mobile menu fallback)

src/features/transactions/
├── components/
│   ├── transaction-list.tsx         # Extracted, redesigned transaction list
│   ├── transaction-list-item.tsx    # Individual transaction row card
│   └── add-transaction.form.tsx     # Redesigned add transaction (TanStack Form)

src/features/products/
├── components/
│   ├── product-list.tsx             # Extracted, redesigned product list
│   └── product-list-item.tsx        # Individual product row

src/features/recurring/
├── components/
│   ├── recurring-list.tsx           # Extracted, redesigned recurring list
│   └── recurring-list-item.tsx      # Individual recurring item row
│   └── add-recurring.form.tsx       # Redesigned add recurring (replaces current new page form)

src/lib/
├── theme.ts                         # Theme provider setup (next-themes)

src/hooks/
├── use-media-query.ts               # Hook for responsive breakpoint detection
```

#### Modified Files

```
src/styles.css                                        # Dark mode as default, updated CSS variables
src/routes/__root.tsx                                  # Add ThemeProvider, update meta
src/routes/_app.tsx                                    # Complete rewrite: responsive layout with mobile nav + desktop sidebar
src/routes/_app.dashboard.index.tsx                    # Redesigned dashboard with TanStack Form
src/routes/_app.dashboard.transactions.tsx             # Redesigned with skeleton loader
src/routes/_app.dashboard.transactions.$id.tsx         # Redesigned with skeleton loader
src/routes/_app.dashboard.products.index.tsx           # Redesigned with skeleton loader
src/routes/_app.dashboard.products.$productId.tsx      # Redesigned with skeleton loader
src/routes/_app.dashboard.products.new.tsx             # Redesigned with skeleton loader
src/routes/_app.dashboard.recurring.index.tsx          # Redesigned with skeleton loader
src/routes/_app.dashboard.recurring.$id.tsx            # Redesigned with skeleton loader
src/routes/_app.dashboard.recurring.new.tsx            # Redesigned with skeleton loader (TanStack Form rewrite)
src/routes/_app.dashboard.profile.tsx                  # Redesigned profile page
src/routes/index.tsx                                   # Redesigned landing page
src/components/custom/field-error.tsx                  # Styled error messages
src/components/custom/loader.button.tsx                # Consistent with new design
```

### Layout Architecture

#### Mobile Layout (< 768px)

```
┌─────────────────────────┐
│  Page Header             │
│  (title + optional action)│
├─────────────────────────┤
│                         │
│   Page Content          │
│   (scrollable)          │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ Home│Trans│Prod│Rec│Prof │
│  🏠  │ 📋  │ 📦 │ 🔁│ 👤  │
└─────────────────────────┘
```

Bottom nav bar:
- Fixed to viewport bottom
- 5 tabs: Home, Transactions, Products, Recurring, Profile
- Each tab: icon + label text
- Active tab highlighted with `primary` color
- If 5 tabs feels too cramped at implementation time, move Profile to a user avatar button in the page header that opens a dropdown/sheet with profile + sign out. Evaluate during implementation.

#### Desktop Layout (>= 768px)

```
┌──────────┬──────────────────────┐
│          │  Page Header         │
│ Sidebar  ├──────────────────────┤
│          │                      │
│ Home     │   Page Content       │
│ Trans    │   (max-width ~800px, │
│ Products │    centered)         │
│ Recurring│                      │
│ Profile  │                      │
│          │                      │
│          │                      │
│ ──────── │                      │
│ Sign Out │                      │
└──────────┴──────────────────────┘
```

Sidebar:
- Fixed-width sidebar (~240px)
- Navigation links with icons + text labels
- Active link highlighted
- User info + sign out at bottom
- Collapsible to icon-only (optional stretch, skip if YAGNI)

#### Responsive Switching

```tsx
// _app.tsx
function AppLayout() {
  return (
    <AuthProvider>
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

### Data Flow

No new server functions. This phase rewrites client-side components only.

**Form migration pattern:** Replace all `useState`-based forms with TanStack Form. The `edit-recurring.form.tsx` is the canonical reference.

**Add transaction form rewrite (currently `_app.dashboard.index.tsx`):**

```ts
// Before: useState + manual validation
const [product, setProduct] = useState("");
const [price, setPrice] = useState("");
function validate() { ... }

// After: TanStack Form + Zod
const form = useForm({
  defaultValues: {
    productName: "",
    description: "",
    price: "",
    type: "expense" as const,
  },
  validators: {
    onBlur: transactionValidators.addFormValidation,
  },
  onSubmit: ({ value }) => {
    mutation.mutate({
      productName: value.productName,
      description: value.description,
      price: Number(value.price),
      type: value.type,
      source: "manual",
    });
  },
});
```

**Validator schemas:**

```ts
// transaction.validators.ts
const addFormValidation = z.object({
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
});

const editFormValidation = z.object({
  price: numberInputValidator,
  type: z.enum(["expense", "income"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date"),
  description: z.string().optional(),
});
```

```ts
// product.validators.ts
const createFormValidation = z.object({
  name: z.string().min(1, "Product name is required"),
});

const editFormValidation = z.object({
  name: z.string().min(1, "Product name is required"),
});
```

### UX/Interaction Patterns

#### Dark Mode First

- `next-themes` provider wraps the app in `__root.tsx`
- Default theme: `"dark"` — set via `defaultTheme="dark"` on `ThemeProvider`
- Theme toggle available on profile page and in desktop sidebar
- Dark mode CSS variables are already defined in `styles.css` — just swap defaults

```tsx
// __root.tsx - in RootDocument
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
  {children}
</ThemeProvider>
```

#### Skeleton Loaders

Replace all `<Suspense fallback={<p>Loading...</p>}>` with purpose-built skeletons.

**Pattern:**

```tsx
// Route component
function RouteComponent() {
  return (
    <Suspense fallback={<TransactionListSkeleton />}>
      <TransactionsList />
    </Suspense>
  );
}

// Skeleton component
function TransactionListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-48" />           {/* Page title */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />  {/* List items */}
      ))}
    </div>
  );
}
```

Skeleton types needed:
- **List skeleton** — title + N rows (transactions, products, recurring)
- **Form skeleton** — label + input placeholders (edit pages)
- **Dashboard skeleton** — form area + list area + summary cards
- **Profile skeleton** — avatar + name + button

#### Form UX

**Validation on blur:**
- Each field validates when the user blurs (tabs/clicks away)
- Error messages appear below the field with smooth animation
- Error text uses `text-destructive text-sm` (already in `FieldError`)
- Enhance `FieldError` to support animated entry (fade-in / slide-down)

**Submit button states:**
- Uses existing `<LoaderButton>` component
- `disabled` when: `!canSubmit || isDefaultValue || mutation.isPending`
- Shows spinner while `mutation.isPending`
- Pattern already established in `edit-recurring.form.tsx`

**Reusable form field wrapper:**

```tsx
// components/custom/form-field.tsx
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
```

#### Page Consistency

Every page follows this structure:

```tsx
<div className="space-y-6">
  <PageHeader title="Transactions" action={<Button>Create</Button>} />
  <Suspense fallback={<ListSkeleton />}>
    <ContentComponent />
  </Suspense>
</div>
```

`PageHeader` component:

```tsx
function PageHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}
```

#### Component Design

**Transaction list items:**
- Card-like rows with subtle border
- Left: product name (bold) + description (muted, truncated)
- Right: price (green for income, red for expense) + date (muted)
- Entire row is tappable → navigates to detail

**Product list items:**
- Card row with product name
- Tag badges inline
- Tappable → navigates to detail

**Recurring list items:**
- Card row: product name + interval badge + price
- Active/inactive indicator (dot or badge)
- Tappable → navigates to detail

**Dashboard (Home tab):**
- Balance summary cards at top (total income, total expenses, net)
- Add transaction form (redesigned with shadcn inputs + TanStack Form)
- Recent transactions list (last 5-10, with "View all" link)

### Error Handling

Standardize all error handling across the app:

#### Server Result Errors (`[err, data]` pattern)

**Toast for mutations:**

```tsx
mutation.mutate(data, {
  onSuccess: (result) => {
    const [err] = result;
    if (err) {
      const message = getErrorMessage(err);
      toast.error(message);
      return;
    }
    toast.success("Transaction updated");
    // ... navigate or reset
  },
});
```

**Error message mapping:**

```ts
// utils/error-messages.ts
function getErrorMessage(err: { reason: string; message?: string }): string {
  switch (err.reason) {
    case "TRANSACTION_NOT_FOUND":
    case "PRODUCT_NOT_FOUND":
    case "RECURRING_PRODUCT_NOT_FOUND":
      return "Item not found. It may have been deleted.";
    case "TRANSACTION_FORBIDDEN":
    case "PRODUCT_FORBIDDEN":
    case "RECURRING_PRODUCT_FORBIDDEN":
      return "You don't have access to this item.";
    default:
      return "Something went wrong. Please try again.";
  }
}
```

**Inline for queries (detail pages):**

```tsx
// Use the exhaustive switch pattern already in products.$productId.tsx
const [err, data] = result;
if (err) {
  switch (err.reason) {
    case "TRANSACTION_NOT_FOUND":
      return <EmptyState message="Transaction not found" />;
    case "TRANSACTION_FORBIDDEN":
      return <EmptyState message="You don't have access to this transaction" />;
    default:
      return <EmptyState message="Something went wrong" />;
  }
}
```

**Rules of thumb:**
- Mutations → toast (action is ephemeral, user needs feedback but page shouldn't change)
- Query errors on detail pages → inline error state (user navigated here, show what happened)
- Query errors on list pages → inline error state with retry option
- Unexpected/unknown errors → generic "Something went wrong" message everywhere

#### Form Validation Errors

Client-side Zod validation on blur — errors appear below each field via `<FieldError>`. No toasts for validation errors; they're always inline.

### Key Implementation Decisions

1. **Dark mode as default, not system** — `defaultTheme="dark"` with `enableSystem={false}`. Users can toggle to light mode manually. This avoids flash-of-wrong-theme issues.

2. **`next-themes` for theme management** — already a dependency in `package.json`. Handles class toggling, localStorage persistence, and SSR correctly.

3. **Mobile nav: 5 tabs** — Home, Transactions, Products, Recurring, Profile. If during implementation 5 tabs feel too cramped on small screens (< 360px), move Profile to a header avatar dropdown. Evaluate visually during implementation.

4. **No sidebar collapse on desktop** — always show the full sidebar with icons + text. Sidebar collapse is YAGNI for a personal expense tracker.

5. **Skeleton loaders per content type** — not a single generic skeleton. Each page type (list, form, dashboard) gets its own skeleton that approximates the real layout. This feels significantly better than a generic spinner.

6. **Extract list components from route files** — currently, route files contain both the route definition and the full UI. Extract list/form components into `features/*/components/` for reuse and cleaner route files.

7. **Rewrite the `_app.dashboard.index.tsx` form** — the current dashboard form uses raw `<input>` elements with `useState` + manual validation. This becomes a TanStack Form with shadcn `<Input>`, `<Select>`, and proper `onBlur` validation. The product input uses the existing `<Combobox>` component (same as recurring form) to search/select or auto-create products.

8. **`form.Subscribe` for submit button** — follow the pattern from `edit-recurring.form.tsx` where the submit button subscribes to `canSubmit`, `isSubmitting`, and `isDefaultValue` to control its disabled/loading state.

9. **Page header as a component** — every page gets a consistent header with title + optional action button. This creates visual consistency across all tabs.

10. **shadcn `Card` for list items** — use the card component for list items instead of raw divs. This gives consistent borders, padding, and hover states with minimal custom CSS.

---

## Cross-Phase Concerns

### Testing Strategy

- **Unit tests** for service layer (update/delete logic, ownership checks)
- **Integration tests** for repo layer (database operations)
- **Component tests** for forms (validation behavior, submit states)
- No E2E tests in scope — the app is a personal tool

### Migration Path

Each phase is independently deployable:
- **Phase 1** ships raw-styled CRUD that works but looks basic
- **Phase 2** adds PWA manifest and service worker
- **Phase 3** reskins everything

Forms created in Phase 1 already use TanStack Form, so Phase 3 only reskins them (adds shadcn styling, `FormField` wrapper, better skeletons) rather than rewriting the form logic.

### File Organization

The feature-based structure is maintained:
```
src/features/<feature>/
├── <feature>.controller.ts    # Server functions (createServerFn)
├── <feature>.service.ts       # Business logic
├── <feature>.repo.ts          # Database queries
├── <feature>.schema.ts        # Drizzle table schema
├── <feature>.models.ts        # TypeScript types
├── <feature>.validators.ts    # Zod schemas for client-side validation
├── <feature>.queries.ts       # TanStack Query options
├── <feature>.mutations.ts     # TanStack Query mutations
├── <feature>.mappers.ts       # Data transformation (if needed)
├── <feature>.dtos.ts          # Input/output types (if needed)
└── components/                # Feature-specific React components
```

## Open Questions

None — all decisions have been made.
