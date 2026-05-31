# Integration Transaction Import Plan

## Goal

Add a new integration feature where external payment integrations (starting with Apple Pay) can create transactions automatically with the correct total and date, while users later enrich the transaction with products, entries, and tags.

## Finalized Decisions

### Ingestion and scope

- Use a public webhook endpoint with token-based auth.
- Use a generic transaction source: `automation` (not `apple_pay`).
- Use a generic ingestion endpoint with provider field in payload.
- Provider enum in v1: `apple_pay` only.

### API tokens

- Users generate API tokens in the app.
- Multiple active tokens allowed.
- Max active tokens per user: 10.
- Token auth transport: `Authorization: Bearer <token>`.
- Store only token hash in DB (never raw token).
- Show raw token once on creation.
- Store token prefix (first 4 chars) and user-defined token name.
- Revoked/invalid token result: `401 Unauthorized`.

### Webhook payload and semantics

- Required fields: `provider`, `eventId`, `amount`, `date`.
- Optional fields: `store`, `description`.
- Do not store raw provider payload; store normalized fields only.
- `amount` is absolute positive expense amount.
- `date` must be ISO datetime including timezone.
- Optional merchant/store maps to `transactions.store`.
- Default description when missing: `Automation import (Apple Pay)`.

### Idempotency and duplicates

- Use dedicated `automation_events` table.
- Unique key for dedupe: `(userId, provider, eventId)`.
- Link event row to created transaction.
- Repeat with same normalized payload: return `200` with duplicate flag.
- Repeat with same `eventId` but mismatched payload fields: return `409`.

### Transaction creation model

- Imported transaction source is `automation`.
- Imported transaction has `needsReview = true`.
- Import creates a placeholder entry immediately.
- Placeholder product strategy: per-user reusable placeholder product.
- `needsReview` clears on first entry edit by user.

### UI and navigation

- Add dedicated Automations page.
- Page includes token management and Apple Pay setup instructions.
- Instructions should be step-by-step with sample JSON.
- Token reveal UX: inline card reveal.
- Navigation placement:
  - Desktop: sidebar link.
  - Mobile: link from More page.

### Migration/backfill

- Add `needsReview` column to transactions.
- Set existing rows to `false` in migration.

### Security posture for v1

- No additional rate limiting in v1.

## Architecture and Data Model Changes

1. Add `automation` to `transaction_source` enum.
2. Add `needs_review` boolean column to `transactions` (default `false`, not null).
3. Add `automation_provider` enum with value `apple_pay`.
4. Add table `automation_tokens`:
   - `id`
   - `user_id`
   - `name`
   - `token_hash`
   - `token_prefix`
   - `created_at`
   - `updated_at`
   - `last_used_at` (nullable)
   - `revoked_at` (nullable)
5. Add table `automation_events`:
   - `id`
   - `user_id`
   - `token_id`
   - `provider`
   - `event_id`
   - `amount`
   - `date`
   - `store` (nullable)
   - `description` (nullable)
   - `transaction_id`
   - `created_at`
6. Add unique index on `automation_events(user_id, provider, event_id)`.

## Implementation Task List

## Phase 1 - Schema and migrations

- [x] Update web transaction schema enum to include `automation`.
- [x] Update job transaction schema enum to include `automation` *(no longer required; schema duplication in job removed by decision)*.
- [x] Add `needsReview` to transaction schema.
- [x] Create automation provider enum and automation tables.
- [x] Wire schema exports/relations in web db modules *(job wiring no longer required)*.
- [x] Generate and review drizzle migration.
- [x] Ensure migration sets existing `transactions.needs_review = false`.

## Phase 2 - Backend automation module

- [x] Create `features/automation` module:
  - [x] `automation.schema.ts`
  - [x] `automation.models.ts`
  - [x] `automation.dtos.ts`
  - [x] `automation.repo.ts`
  - [x] `automation.service.ts`
  - [x] `automation.controller.ts`
- [x] Implement token creation with:
  - [x] name validation
  - [x] active-token limit (max 10)
  - [x] hash-only storage
  - [x] prefix storage
  - [x] return raw token once
- [x] Implement token listing metadata (no raw token exposure).
- [x] Implement token revocation.
- [x] Implement bearer-token verification helper for webhook.

## Phase 3 - Public webhook endpoint

- [x] Add route handler for automation imports (public POST endpoint).
- [x] Parse and validate `Authorization: Bearer` token.
- [x] Validate payload contract (`provider`, `eventId`, `amount`, `date`).
- [x] Enforce provider enum (`apple_pay` in v1).
- [x] Enforce absolute positive amount semantics.
- [x] Parse ISO datetime with timezone.
- [x] Implement idempotency flow using `automation_events`.
- [x] Implement mismatch detection and `409` response.
- [x] Implement duplicate-success response (`200`, duplicate flag).
- [x] Create transaction with source `automation` and `needsReview=true`.
- [x] Resolve/create per-user placeholder product.
- [x] Create placeholder expense entry.
- [x] Persist normalized automation event record linked to transaction.

## Phase 4 - Transactions integration

- [x] Extend transaction models/types for source `automation`.
- [x] Ensure DTO validators accept source `automation` where relevant.
- [x] Propagate `needsReview` through repo/service/query return types.
- [x] Update transaction update flow to clear `needsReview` on first entry edit.

## Phase 5 - Automations UI

- [x] Add route/page for Automations.
- [x] Implement token creation form (name input).
- [x] Implement inline one-time token reveal card with copy action.
- [x] Implement token list UI (name, prefix, status, timestamps).
- [x] Implement revoke action in UI.
- [x] Add Apple Pay setup instructions:
  - [x] step-by-step setup
  - [x] endpoint format
  - [x] bearer token example
  - [x] sample JSON payload

## Phase 6 - Navigation

- [x] Add Automations link to desktop sidebar.
- [x] Add Automations link to mobile More page.

## Phase 7 - Transaction UX cues

- [x] Show `needsReview` indicator in transaction list.
- [x] Show `needsReview` indicator on transaction details page.

## Phase 8 - Testing

- [x] Unit tests for token creation/list/revoke/hash/limit behavior.
- [x] Unit tests for bearer token auth failures and success.
- [x] Unit tests for webhook payload validation.
- [x] Unit tests for idempotent duplicate success path.
- [x] Unit tests for mismatch conflict path (`409`).
- [x] Unit tests for imported transaction creation semantics.
- [x] Unit tests for clearing `needsReview` on entry edit.
- [x] Update existing transaction tests for new source/flag.
- [x] Run `pnpm test:web` and fix regressions.

## Acceptance Criteria

- User can create, view, and revoke multiple API tokens from Automations page.
- Raw token is shown only once at creation and never retrievable again.
- Webhook accepts valid bearer token and payload, creates transaction + placeholder entry.
- Imported transaction has correct date and total, source `automation`, and `needsReview=true`.
- Repeated same event returns success without duplicate transaction creation.
- Repeated same event with changed payload returns `409`.
- Invalid/revoked token returns `401`.
- User editing entries clears `needsReview`.
- Automations page is discoverable via desktop sidebar and mobile More.

## Out of Scope (v1)

- Rate limiting/throttling.
- Storing raw webhook payload.
- Non-Apple providers beyond enum extensibility.
- Automated provider-specific setup wizards.
