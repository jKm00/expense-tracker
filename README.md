# Expense Tracker

A personal finance app for tracking transactions, recurring expenses, shopping items, tags, and analytics.

Live app: [ex.edvardsen.dev](https://ex.edvardsen.dev)

## Apps

This is a pnpm monorepo with two apps:

- `apps/web` - TanStack Start web app and API routes
- `apps/job` - recurring transaction job that calls the web app

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables:

- `apps/web/.env` from `apps/web/.env.example`
- `apps/job/.env` from `apps/job/.env.example`

3. Start Postgres:

```bash
docker compose up -d
```

4. Apply migrations:

```bash
pnpm db:migrate
```

5. Start the web app:

```bash
pnpm dev
```

## Commands

```bash
pnpm build      # build the web app
pnpm test:web   # run web tests
pnpm test:job   # run job tests
pnpm job        # run the recurring job once
```

## Database

The Drizzle schema is exported from `apps/web/src/lib/db/schema.ts`.

```bash
pnpm db:generate <name> # generate a migration
pnpm db:migrate         # apply migrations
pnpm db:studio          # open Drizzle Studio
pnpm db:seed            # seed local data
pnpm db:reset           # reset local data
```

## Recurring Job

The job app triggers `apps/web` through `POST /api/internal/recurring/run` and creates due recurring transactions.

Required env values:

- `apps/web`: `RECURRING_JOB_TOKEN`
- `apps/job`: `API_ENDPOINT`, `RECURRING_JOB_TOKEN`

Use the same `RECURRING_JOB_TOKEN` in both apps.

## Codebase

- `apps/web/src/routes` - file-based routes and API endpoints
- `apps/web/src/features` - feature modules
- `apps/web/src/components` - reusable UI components
- `apps/web/src/lib` - shared web utilities
- `apps/job/src` - recurring job entry point

Main stack: TanStack Start, TanStack Router, TanStack Query, Drizzle, PostgreSQL, Tailwind CSS, Vitest.
