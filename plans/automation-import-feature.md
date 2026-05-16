# Automation Transaction Import Plan

## Goal

Add a new automation feature where external payment automations (starting with Apple Pay) can create transactions automatically with the correct total and date, while users later enrich the transaction with products, entries, and tags.

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

- [ ] Update web transaction schema enum to include `automation`.
- [ ] Update job transaction schema enum to include `automation`.
- [ ] Add `needsReview` to transaction schema.
- [ ] Create automation provider enum and automation tables.
- [ ] Wire schema exports/relations in web and job db modules.
- [ ] Generate and review drizzle migration.
- [ ] Ensure migration sets existing `transactions.needs_review = false`.

## Phase 2 - Backend automation module

- [ ] Create `features/automation` module:
  - [ ] `automation.schema.ts`
  - [ ] `automation.models.ts`
  - [ ] `automation.dtos.ts`
  - [ ] `automation.repo.ts`
  - [ ] `automation.service.ts`
  - [ ] `automation.controller.ts`
- [ ] Implement token creation with:
  - [ ] name validation
  - [ ] active-token limit (max 10)
  - [ ] hash-only storage
  - [ ] prefix storage
  - [ ] return raw token once
- [ ] Implement token listing metadata (no raw token exposure).
- [ ] Implement token revocation.
- [ ] Implement bearer-token verification helper for webhook.

## Phase 3 - Public webhook endpoint

- [ ] Add route handler for automation imports (public POST endpoint).
- [ ] Parse and validate `Authorization: Bearer` token.
- [ ] Validate payload contract (`provider`, `eventId`, `amount`, `date`).
- [ ] Enforce provider enum (`apple_pay` in v1).
- [ ] Enforce absolute positive amount semantics.
- [ ] Parse ISO datetime with timezone.
- [ ] Implement idempotency flow using `automation_events`.
- [ ] Implement mismatch detection and `409` response.
- [ ] Implement duplicate-success response (`200`, duplicate flag).
- [ ] Create transaction with source `automation` and `needsReview=true`.
- [ ] Resolve/create per-user placeholder product.
- [ ] Create placeholder expense entry.
- [ ] Persist normalized automation event record linked to transaction.

## Phase 4 - Transactions integration

- [ ] Extend transaction models/types for source `automation`.
- [ ] Ensure DTO validators accept source `automation` where relevant.
- [ ] Propagate `needsReview` through repo/service/query return types.
- [ ] Update transaction update flow to clear `needsReview` on first entry edit.

## Phase 5 - Automations UI

- [ ] Add route/page for Automations.
- [ ] Implement token creation form (name input).
- [ ] Implement inline one-time token reveal card with copy action.
- [ ] Implement token list UI (name, prefix, status, timestamps).
- [ ] Implement revoke action in UI.
- [ ] Add Apple Pay setup instructions:
  - [ ] step-by-step setup
  - [ ] endpoint format
  - [ ] bearer token example
  - [ ] sample JSON payload

## Phase 6 - Navigation

- [ ] Add Automations link to desktop sidebar.
- [ ] Add Automations link to mobile More page.

## Phase 7 - Transaction UX cues

- [ ] Show `needsReview` indicator in transaction list.
- [ ] Show `needsReview` indicator on transaction details page.

## Phase 8 - Testing

- [ ] Unit tests for token creation/list/revoke/hash/limit behavior.
- [ ] Unit tests for bearer token auth failures and success.
- [ ] Unit tests for webhook payload validation.
- [ ] Unit tests for idempotent duplicate success path.
- [ ] Unit tests for mismatch conflict path (`409`).
- [ ] Unit tests for imported transaction creation semantics.
- [ ] Unit tests for clearing `needsReview` on entry edit.
- [ ] Update existing transaction tests for new source/flag.
- [ ] Run `pnpm test:web` and fix regressions.

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
