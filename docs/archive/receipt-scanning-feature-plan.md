# Receipt Scanning Feature Plan

## Goal

Add receipt scanning so users can upload a receipt image, get a suggested transaction/check-out entry list, review and edit the result, then complete it into normal transaction entries. The feature must avoid silently creating duplicate products or over-generalizing products, and it must learn each user's preferred product mappings over time.

## Core Answer

This feature is possible, but it should be split into two problems:

1. Receipt extraction: read an image and return structured receipt data.
2. Product matching: map extracted receipt item names to the user's app products.

Use AI for receipt extraction in v1. Do not use AI for final product identity decisions. Product matching should be deterministic, conservative, user-specific, testable, and corrected by user review.

## Existing Codebase Context

- `transactions.source` already includes `scan`, `shopping`, and `integration`.
- `transactions.needsReview` already exists, but this scan flow should keep review in memory and save completed scans as reviewed.
- `entries.productId` is required, so unresolved scan lines cannot become saved entries.
- `entries.quantity` is currently an integer, so weighted items should be normalized to `quantity = 1` and `price = final line total` in v1.
- Transaction entry `price` means unit price. For integer quantities greater than 1, store per-unit price and calculate line total as `quantity * price`.
- `productAliases` already exist, but they are user-facing search aliases. Do not store receipt item names there.
- Products are soft-deleted via `deletedAt`; hidden scan mappings must be explicitly removed during product soft-delete.
- Shopping checkout already uses in-memory editable entries and persists only on completion, which matches the scan review model.
- Existing manual transaction and checkout forms should stay simple; scan-specific review should be separate.

## Finalized Decisions

| Area | Decision | Implementation Note |
| --- | --- | --- |
| V1 entry points | Both general transaction scan and shopping checkout scan | Use a shared scan module with mode-specific wrappers. |
| Build order | Core -> transaction scan -> checkout scan | Prove shared backend and general scan first, then add checkout context. |
| Capture UX | File input v1 | Use `accept="image/*,application/pdf"`; optionally use `capture="environment"` for mobile camera picker. |
| Camera UI | No custom camera UI in v1 | Avoid browser camera permission/video/canvas complexity. |
| AI usage | AI extraction only | AI reads the receipt image and returns structured JSON. App code performs product matching. |
| AI provider | OpenAI adapter | Keep provider-specific code behind a small server-side `extractReceipt` adapter. |
| Image retention | Do not store images | Process server-side and discard the raw image. |
| Extracted JSON retention | Discard after completion | Persist only normal transaction data, hidden mappings, and minimal scan attempt metadata. |
| Review persistence | In-memory review | Do not create persisted draft transactions before user completion. |
| Completion model | One server call | Submit reviewed scan entries and source receipt item names together. |
| Atomic writes | Use DB transaction | Product creation, transaction/checkout save, shopping cleanup, and mapping upserts should commit/rollback together. |
| Product matching | Deterministic scoring | Exact hidden mappings first, then exact product names, then conservative token/fuzzy suggestions. |
| Match bias | Prefer blanks | False negatives are safer than false positives. |
| Low-confidence UI | Blank with suggestions | Auto-fill only high-confidence matches; show suggestions for unresolved lines. |
| Suggestion count | Top 3 + search | Show top three quick-pick candidates plus full product search/select. |
| Aliases in scan matching | Suggestions only | Product aliases can help candidate suggestions but must not auto-fill scan lines. |
| Hidden learning | Separate mapping table | Do not use `productAliases` for receipt learning. |
| Mapping scope | Global per user | No store-specific mappings in v1. |
| Mapping key | Normalized extracted item name | Do not key by full raw line because prices/discounts/weights can fragment matches. |
| Mapping conflict | Latest confirmed wins | If same item name maps to a different product later, update mapping to latest confirmed product. |
| Mapping trigger | All completed selections | Completion is confirmation; learn every completed scanned line with a selected product. |
| Mapping duplicate | No-op if identical mapping exists | Do not create duplicate mapping rows. |
| Mapping UI | No management UI v1 | Corrections happen by completing later scans with corrected selections. |
| Product creation | Never auto-create | Only user-selected/new products from review should persist. |
| New product timing | Save on completion | Review can carry `{ id: null, name }`; completion creates products atomically. |
| Unresolved lines | Require resolution | User must select/create a product or delete the line before completion. |
| Entry editing | Full review editing | User can add, edit, and delete review entries before completion. |
| Non-product receipt lines | Only products | Exclude tax/payment/subtotal/summary lines. Discounts should be reflected in final product price. |
| Bottle deposits | Fold into product total if possible | Extraction should include deposits in the relevant product price when possible. |
| Total mismatch | Warn only | Show receipt total vs reviewed total mismatch, but allow completion. |
| Weighted items | Quantity 1, total price | Store weighted lines as `quantity = 1`, `price = final line total`. |
| Duplicate mapped product lines | Keep separate | Preserve receipt line structure even if multiple lines map to same app product. |
| Entry tags | Leave empty | Do not auto-fill entry tags from product tags in v1. |
| Scan review display | Always show receipt item name | Show extracted receipt name separately from selected app product. |
| Match badges | Only unresolved markers | Avoid noisy confidence/source badges for normal matched rows. |
| Metadata prefill | Prefill editable store/date | Use extracted store/date when available; user can edit. |
| Duplicate receipt detection | No detection v1 | Do not warn/block same store/date/total duplicates initially. |
| Offline behavior | Disable scan offline | Scanning requires network and OpenAI. |
| Upload controls | Enforce limits | Validate type/size and downscale/compress large images before AI. |
| Rate limiting | 5 extraction attempts per day | Protect OpenAI cost and abuse with per-user scan limits. Completion/save actions do not count. |
| Scan attempt logs | Minimal logs | Store status/timing/provider/item count/error category, but no receipt content. |
| Deleted products | Delete mappings on soft-delete | Also filter out soft-deleted products during matching. |
| General scan source | `scan` | General receipt scan creates source `scan` transactions. |
| General scan review flag | Save as reviewed | Completed scan transactions should have `needsReview = false`. |
| Checkout scan source | `shopping` | Scanned shopping checkout still creates/updates source `shopping` transactions. |
| Checkout matching scope | Prioritize checked items | Checked shopping items should win matching ties before all-product matching. |
| Checkout row source | Receipt lines primary | Receipt lines create review rows; shopping list is context, not the row source. |
| Checkout unmatched checked items | Keep checked | Checked shopping items not matched to completed receipt entries stay on the list. |
| Checkout extras | No shopping-list mutation | Receipt-only extras become transaction entries only. |
| Checkout linking | Support linking | Scanned checkout can update an existing selected transaction, like manual checkout. |
| Linked transaction behavior | Replace entries | Reviewed scan entries replace linked transaction entries. |
| Failure handling | Retry + manual fallback | On extraction failure, show error, retry/new upload, and manual-form link. |
| Test strategy | Matcher tests v1 | Mock AI output; thoroughly test deterministic matching and learning. |

## Proposed Architecture

### Shared scan module

Create a dedicated feature module, likely `apps/web/src/features/receipt-scanning/`, containing:

- `receipt-scanning.schema.ts`
- `receipt-scanning.models.ts`
- `receipt-scanning.dtos.ts`
- `receipt-scanning.repo.ts`
- `receipt-scanning.service.ts`
- `receipt-scanning.controller.ts`
- `receipt-scanning.queries.ts`
- `receipt-scanning.mutations.ts`
- `components/receipt-upload.tsx`
- `components/receipt-scan-review.tsx`
- `components/receipt-scan-line.tsx`
- `components/receipt-total-warning.tsx`
- `receipt-matching.ts`
- `receipt-normalization.ts`
- `receipt-openai.adapter.ts`

The shared module should own extraction, matching, review models, hidden mapping learning, scan attempt logs, and scan-specific submit DTOs.

Mode-specific pages should provide context and final submit behavior:

- `/dashboard/transactions/scan`
- `/dashboard/shopping/checkout/scan`

### High-level flow

1. User opens a scan route.
2. User uploads or captures an image using file input.
3. Server validates rate limit and file constraints.
4. Server sends the image to OpenAI through the adapter.
5. Adapter returns strict normalized receipt JSON.
6. Service runs deterministic product matching.
7. UI renders editable in-memory review lines.
8. User resolves blanks, edits prices/quantities, adds/deletes lines, and edits store/date.
9. User completes the scan.
10. Server validates all submitted scan lines are resolvable.
11. Server saves transaction/checkout through scan-specific service flow.
12. Server upserts hidden mappings for every completed line with a selected/new product and source `receiptItemName`.
13. User is navigated to the saved transaction.

## Data Model Changes

### `receipt_item_mappings`

Purpose: hidden per-user learning table for receipt item names mapped to app products.

Fields:

- `id uuid primary key defaultRandom()`
- `userId text not null references user(id) on delete cascade`
- `productId uuid not null references products(id) on delete cascade`
- `itemName text not null`
- `normalizedItemName text not null`
- `confirmationCount integer not null default 1`
- `lastConfirmedAt timestamp not null defaultNow()`
- `createdAt timestamp not null defaultNow()`
- `updatedAt timestamp not null defaultNow()`

Indexes:

- Unique: `(userId, normalizedItemName)`
- Index: `(userId, productId)`
- Index: `(userId, normalizedItemName)` if not implied by the unique index/query planner.

Behavior:

- Upsert on scan completion.
- If same user/name/product already exists, increment `confirmationCount`, update `itemName`, `lastConfirmedAt`, and `updatedAt`.
- If same user/name maps to a different product, update `productId` to latest confirmed product, increment `confirmationCount`, update `itemName`, `lastConfirmedAt`, and `updatedAt`.
- Do not expose this table in product search or alias UI.
- On product soft-delete, explicitly delete mappings for that product.
- Matching queries must ignore mappings whose product has `deletedAt != null`.

### `receipt_scan_attempts`

Purpose: rate limiting and minimal observability without storing receipt content.

Fields:

- `id uuid primary key defaultRandom()`
- `userId text not null references user(id) on delete cascade`
- `provider text not null` or enum with `openai`
- `status text not null` or enum with `success`, `failed`, `rate_limited`, `rejected`
- `itemCount integer`
- `durationMs integer`
- `errorCategory text`
- `createdAt timestamp not null defaultNow()`

Do not store:

- Raw image.
- Raw OCR text.
- Extracted item names.
- Full provider response.
- Full receipt JSON.

## AI Extraction Contract

Use a strict schema and reject/flag unusable model output. The exact implementation can use Zod validation after provider response parsing.

Suggested normalized shape:

```ts
type ExtractedReceipt = {
  store?: string;
  date?: string; // ISO date or datetime if known
  total?: string; // normalized decimal string, e.g. "123.45"
  confidence: number; // 0-1 overall confidence
  warnings: string[];
  items: ExtractedReceiptItem[];
};

type ExtractedReceiptItem = {
  name: string; // product-like item name only
  quantity: string; // app-compatible positive integer string
  unitPrice: string; // normalized decimal string
  lineTotal: string; // normalized decimal string
  confidence: number; // 0-1
};
```

Extraction rules for the prompt/schema:

- Return only product lines.
- Exclude subtotal, tax, payment, change, card, loyalty, and summary lines.
- Apply discounts to final product prices; do not return discount lines separately.
- Include bottle deposits in the relevant product's total where possible.
- For weighted/fractional items, return `quantity = "1"`, `unitPrice = final line total`, and `lineTotal = final line total`.
- For integer quantity lines, return unit price as per-unit price and line total as quantity times unit price.
- Normalize money values to dot-decimal strings compatible with the app.
- If money cannot be normalized, return a warning or omit the item rather than inventing a price.

## Product Matching Strategy

### Normalization

Use one shared normalization function for item names, product names, aliases, and mappings. It should be close to existing product search normalization:

- Unicode normalize.
- Remove diacritics.
- Lowercase.
- Remove punctuation except useful separators if needed.
- Collapse whitespace.
- Trim.

Keep this function in the receipt scanning module or extract a shared utility if reused with `ProductSelect`.

### Matching order

For each extracted receipt item:

1. Hidden mapping exact match by `(userId, normalizedItemName)` where mapped product is not soft-deleted.
2. Exact normalized product name match.
3. Checkout mode only: checked shopping-list products receive priority/tie-break boost.
4. Conservative token/fuzzy scoring against product names.
5. Product aliases can contribute suggestions only, never automatic selection.

### Auto-fill threshold

Auto-fill only when confidence is high enough to avoid false positives:

- Hidden mapping exact match: auto-fill.
- Exact product-name match: auto-fill.
- Fuzzy match: generally suggestion only unless future real data proves a safe threshold.
- Alias match: suggestion only.

Unresolved lines should show top 3 candidates and a full product selector/search.

### Checkout-specific matching

For `/dashboard/shopping/checkout/scan`:

- Receipt lines are the primary row source.
- Checked shopping-list items are context for matching priority.
- Prefer checked item products when scores tie or are close.
- If a receipt line maps to a checked shopping-list product, retain `shoppingItemId` on the review line so completion can remove that item from the shopping list.
- Checked shopping-list items with no completed matched receipt line remain checked on the list.
- Receipt extras included by the user become transaction entries only; do not mutate the shopping list.

## Review UI Requirements

Use one shared review component with props/config for mode:

- `mode: "transaction" | "shopping-checkout"`
- Products list.
- Optional checked shopping items.
- Initial extracted receipt result.
- Initial matched scan lines.
- Submit handler.

Review UI should include:

- Editable store field.
- Editable date field.
- Optional description field if consistent with transaction/checkout forms.
- List of editable scan lines.
- Extracted receipt item name shown separately from selected product.
- Product selector with create-on-completion support through `{ id: null, name }`.
- Quantity field.
- Unit price field.
- Calculated line total display.
- Add entry action.
- Delete entry action.
- Unresolved marker only for rows missing a product or invalid required fields.
- Top 3 suggestions for unresolved rows.
- Receipt total vs reviewed total warning when extracted total exists and differs.
- Complete button disabled until all remaining rows have product, positive integer quantity, and positive price.
- Retry/upload another image action while still before completion.
- Manual fallback link.

Do not add noisy match-source badges for resolved rows in v1.

## Routes and Navigation

### General transaction scan

Route:

- `/dashboard/transactions/scan`

Entry points:

- Add `Scan receipt` action on `/dashboard/transactions/new`.
- Consider also adding an action on transaction list later, but v1 can start with the new transaction page.

Behavior:

- Creates a new transaction with source `scan`.
- Saves as reviewed (`needsReview = false`).
- Uses all user products for matching.
- On success, navigates to `/dashboard/transactions/$id`.

### Shopping checkout scan

Route:

- `/dashboard/shopping/checkout/scan`

Entry points:

- Add `Scan receipt` action at the top of `/dashboard/shopping/checkout`.

Behavior:

- Uses receipt lines as rows.
- Uses checked shopping-list items as matching priority context.
- Supports linking to existing transaction like current manual checkout.
- Reuses selected transaction selector/logic where practical.
- Creates or updates a `shopping` source transaction.
- Replaces linked transaction entries with reviewed receipt entries.
- Removes only matched completed `shoppingItemId`s from the shopping list.
- Leaves unmatched checked shopping-list items checked.
- On success, navigates to `/dashboard/transactions/$id`.

## Server API and DTOs

### Extract receipt endpoint

Input:

- Image/PDF file or encoded file payload, depending on TanStack Start/server-fn constraints.

Validation:

- User authenticated.
- Online/server-only operation.
- File type allow-list: JPEG, PNG, HEIC/HEIF if supported by provider/browser path, and PDF.
- File size max.
- Optional image normalization/compression before provider call.
- Per-user rate limit check before OpenAI call: 5 extraction attempts per day. Reviewing and saving scan results do not count.

Output:

- Structured extracted receipt.
- Matched review lines with selected product where high-confidence.
- Candidate suggestions for unresolved lines.
- Warnings.

### Complete transaction scan endpoint

Input scan-specific DTO:

```ts
type CompleteReceiptTransactionScanDTO = {
  store?: string;
  description?: string;
  date: Date;
  entries: ReceiptScanSubmitEntry[];
};
```

### Complete checkout scan endpoint

Input scan-specific DTO:

```ts
type CompleteReceiptCheckoutScanDTO = {
  store?: string;
  description?: string;
  date: Date;
  transactionId?: string;
  keepUncheckedItems: boolean;
  entries: ReceiptScanSubmitEntry[];
};
```

Shared scan entry shape:

```ts
type ReceiptScanSubmitEntry = {
  receiptItemName: string;
  shoppingItemId?: string;
  product: {
    id: string | null;
    name: string;
  };
  quantity: string;
  price: string;
  type: "expense";
  tagIds: string[];
};
```

Validation:

- `receiptItemName` required and non-empty for learned scan lines.
- `product` required for all submitted rows.
- Product can be existing `id` or new `{ id: null, name }`.
- Quantity must remain positive integer in v1.
- Price must be positive decimal string.
- Tags default empty.
- Rows deleted by user should not be submitted and should not be learned.

Completion behavior:

- Convert scan entries to normal transaction entries.
- Save transaction/checkout atomically.
- Resolve new products on completion.
- Upsert hidden mappings using the resolved product IDs and each submitted `receiptItemName`.
- Return saved transaction.

## Implementation Task List

### Phase 1 - Schema and migrations

- [ ] Add `receipt_item_mappings` schema.
- [ ] Add `receipt_scan_attempts` schema.
- [ ] Export new schemas from `src/lib/db/schema.ts`.
- [ ] Add relations in `src/lib/db/relations.ts`.
- [ ] Add indexes/unique constraints for mapping lookup and upsert.
- [ ] Generate and review Drizzle migration.
- [ ] Verify migration does not alter existing transaction/product data.

### Phase 2 - Shared receipt scanning backend module

- [ ] Create `features/receipt-scanning` module files.
- [ ] Implement shared receipt item name normalization.
- [ ] Implement mapping repository:
  - [ ] Get mappings by normalized names for a user.
  - [ ] Upsert latest confirmed mapping.
  - [ ] Delete mappings by product ID for soft-delete cleanup.
  - [ ] Filter out soft-deleted products during mapping lookup.
- [ ] Implement scan attempt repository:
  - [ ] Count today's extraction attempts for rate limiting.
  - [ ] Save minimal attempt metadata.
- [ ] Implement basic per-user rate-limit service: 5 extraction attempts per day.
- [ ] Implement OpenAI receipt extraction adapter.
- [ ] Validate adapter output with Zod.
- [ ] Convert extraction output into normalized review models.
- [ ] Implement deterministic product matcher.
- [ ] Include alias-based suggestions without alias auto-fill.
- [ ] Implement checkout-aware matching priority using checked shopping items.

### Phase 3 - Atomic completion support

- [ ] Add transaction-aware repo/service support where needed so scan completion can use one DB transaction.
- [ ] Ensure product creation, transaction save, entries, entry tags, shopping cleanup, and mapping upserts can share the same transaction client.
- [ ] Create scan transaction completion service:
  - [ ] Validate scan DTO.
  - [ ] Save source `scan` transaction with `needsReview = false`.
  - [ ] Resolve/create products from submitted entries.
  - [ ] Save entries with empty/default tags unless user added tags.
  - [ ] Upsert mappings after product IDs are known.
- [ ] Create scan checkout completion service:
  - [ ] Validate scan DTO.
  - [ ] Create/update source `shopping` transaction.
  - [ ] Replace linked transaction entries when `transactionId` is provided.
  - [ ] Remove only matched submitted `shoppingItemId`s from shopping list.
  - [ ] Keep unmatched checked shopping items checked.
  - [ ] Upsert mappings after product IDs are known.
- [ ] Ensure mapping upsert failure rolls back all completion writes via the shared DB transaction.

### Phase 4 - Product deletion integration

- [ ] Update product deletion service so soft-delete explicitly deletes hidden receipt mappings for the product.
- [ ] Add tests confirming mappings are removed when product is soft-deleted.
- [ ] Ensure matcher ignores mappings for soft-deleted products even if stale rows exist.

### Phase 5 - Extraction/upload UI

- [ ] Build shared `ReceiptUpload` component.
- [ ] Use file input with `accept="image/*,application/pdf"`.
- [ ] Add optional `capture="environment"` if it works well on target browsers.
- [ ] Enforce client-side file type/size validation.
- [ ] Add image downscale/compression before upload if practical.
- [ ] Disable scan upload while offline.
- [ ] Show retry/upload-another-image on extraction failure.
- [ ] Provide manual fallback link.

### Phase 6 - Shared review UI

- [ ] Build shared `ReceiptScanReview` component.
- [ ] Show editable store/date/description metadata.
- [ ] Show extracted receipt item name for every row.
- [ ] Show selected product separately from receipt item name.
- [ ] Show product selector with top 3 quick suggestions for unresolved rows.
- [ ] Allow product creation as `{ id: null, name }` to be resolved on completion.
- [ ] Allow editing quantity and unit price.
- [ ] Show calculated line total.
- [ ] Allow adding entries.
- [ ] Allow deleting entries.
- [ ] Require every submitted row to have product, quantity, and price.
- [ ] Show unresolved marker only for incomplete rows.
- [ ] Show receipt total mismatch warning when applicable.
- [ ] Keep tags empty by default.
- [ ] Do not show noisy match-source badges for resolved rows.

### Phase 7 - General transaction scan route

- [ ] Add `/dashboard/transactions/scan` route.
- [ ] Load products and tags needed by review.
- [ ] Wire upload -> extraction/matching -> review.
- [ ] Submit to transaction scan completion endpoint.
- [ ] Save source `scan` transaction.
- [ ] Navigate to transaction detail on success.
- [ ] Add `Scan receipt` action from `/dashboard/transactions/new`.

### Phase 8 - Shopping checkout scan route

- [ ] Add `/dashboard/shopping/checkout/scan` route.
- [ ] Load shopping list, products, tags, integration tokens, and candidate transactions as needed.
- [ ] Block or message when no checked shopping items exist if that remains desired for checkout context.
- [ ] Wire upload -> extraction/matching with checked-item priority -> review.
- [ ] Include transaction link selector support from manual checkout.
- [ ] Submit to checkout scan completion endpoint.
- [ ] Save/update source `shopping` transaction.
- [ ] Replace entries when linking to existing transaction.
- [ ] Remove only matched submitted shopping item IDs.
- [ ] Keep unmatched checked shopping items checked.
- [ ] Navigate to transaction detail on success.
- [ ] Add `Scan receipt` action at the top of `/dashboard/shopping/checkout`.

### Phase 9 - OpenAI configuration and security

- [ ] Add required environment variable documentation for OpenAI API key.
- [ ] Ensure API key is server-only and never exposed to the client bundle.
- [ ] Add graceful missing-key error for local/dev environments.
- [ ] Add provider timeout handling.
- [ ] Add provider error categories for minimal scan attempt logs.
- [ ] Avoid logging image data, extracted item names, or full provider responses.

### Phase 10 - Tests

- [ ] Unit-test receipt item normalization.
- [ ] Unit-test hidden mapping exact match auto-fill.
- [ ] Unit-test exact product-name auto-fill.
- [ ] Unit-test alias match is suggestion only.
- [ ] Unit-test fuzzy/product token matches remain suggestions under conservative thresholds.
- [ ] Unit-test checkout checked-item priority.
- [ ] Unit-test blank-with-suggestions behavior for low-confidence matches.
- [ ] Unit-test mapping upsert no-op/increment when same product exists.
- [ ] Unit-test mapping conflict updates to latest confirmed product.
- [ ] Unit-test product soft-delete removes mappings.
- [ ] Unit-test matcher ignores stale mappings to soft-deleted products.
- [ ] Unit-test scan transaction completion creates source `scan`, reviewed transaction.
- [ ] Unit-test scan checkout completion creates/updates source `shopping`.
- [ ] Unit-test scan checkout removes only matched shopping item IDs.
- [ ] Unit-test unmatched checked shopping items remain checked.
- [ ] Unit-test new product creation on completion.
- [ ] Unit-test atomic rollback on completion failure where feasible.
- [ ] Mock OpenAI extraction in tests; do not call real AI in automated tests.
- [ ] Run `pnpm test:web` and fix regressions.

## Acceptance Criteria

- User can open `/dashboard/transactions/scan`, upload a receipt image, review extracted lines, resolve products, and save a normal transaction.
- General scan transactions use source `scan` and are saved with `needsReview = false`.
- User can open `/dashboard/shopping/checkout/scan`, upload a receipt image, review extracted lines, and complete checkout.
- Shopping scan transactions use source `shopping`.
- Shopping scan can link to an existing transaction and replace entries.
- Shopping scan removes only matched completed shopping-list items.
- Unmatched checked shopping-list items remain checked.
- Receipt images are not stored.
- Full extracted receipt JSON is not stored after completion.
- Hidden mappings are created/updated only on completion for submitted rows with selected/new products.
- Hidden mappings do not appear as product aliases or in user-facing product search alias lists.
- Existing product aliases can appear only as scan suggestions, not automatic scan matches.
- No unmatched line can be saved silently; user must resolve or delete it.
- The review UI warns, but does not block, when reviewed total differs from extracted receipt total.
- Weighted/fractional receipt lines are saved as `quantity = 1` and `price = final line total`.
- Multiple receipt lines mapped to the same product remain separate transaction entries.
- Entry tags remain empty by default.
- Offline users cannot start receipt scanning and see a clear unavailable state.
- Basic per-user rate limiting protects OpenAI calls.
- Automated tests cover matcher and learning behavior with mocked extracted receipts.

## Out of Scope For V1

- Custom in-browser camera UI.
- Persisted draft scan transactions before completion.
- Storing receipt images.
- Storing full extracted receipt JSON after completion.
- User-facing hidden mapping management UI.
- Store-specific mappings.
- Embeddings/vector search.
- AI-driven product ID matching.
- Non-AI OCR/parser fallback.
- Duplicate receipt detection.
- Auto-creating products without explicit user action.
- Auto-filling entry tags from product tags.
- Decimal/fractional quantity support in the global transaction schema.
- Unit fields like kg/l/pieces.
- Receipt image integration tests that call real OpenAI in CI.

## Key Risks and Mitigations

### Risk: Wrong product auto-filled

Mitigation: prefer blanks, auto-fill only hidden mappings and exact product names, show suggestions for everything else.

### Risk: Duplicate products from receipt variants

Mitigation: never auto-create products; creation happens only through explicit review and completion.

### Risk: Hidden mappings become stale

Mitigation: latest confirmed completion wins; product soft-delete removes mappings; matcher ignores soft-deleted products.

### Risk: AI extracts bad prices or misses lines

Mitigation: strict schema validation, total mismatch warning, user review before save, retry/manual fallback.

### Risk: OpenAI cost or abuse

Mitigation: upload limits, image normalization, per-user rate limits, minimal scan attempt logs.

### Risk: Multi-write partial failure

Mitigation: implement scan completion as a DB transaction.

### Risk: Checkout scan diverges from manual checkout behavior

Mitigation: reuse existing transaction/shopping completion semantics where possible, but keep scan-specific cleanup rules documented and tested.
