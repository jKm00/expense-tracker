# Expense Tracker

A financial tracking application for managing income and expenses with analytics to help make better financial decisions.

Built as a PWA (Progressive Web App) first, but works seamlessly on desktop too.

## Live Apps

- Version 1: [ex.edvardsen.dev](https://ex.edvardsen.dev)
- Version 2 (Beta): [ex.v2.edvardsen.dev](https://ex.v2.edvardsen.dev)

## Setup

1. Configure env values for both `apps/job` and `apps/web`. Use `env.example` as reference

2. Start local DB:

```bash
docker compose up -d
```

3. Apply migrations:

```bash
pnpm db:migrate
```

4. Start web app:

```bash
pnpm dev
```

### Job app

The job is a task that runs once a day. It fetches recurring items for the day of the run and creates transactions for them by sending request to the web app.

To run it locally:

- Configure env values (Remeber to configure `RECURRING_JOB_TOKEN` in both `apps/job` and `apps/web`)
- Make sure web app is running first
- Run job once with:

```bash
pnpm job
```

## Building

```bash
pnpm build
```

## Database

### Migration

Migrations are generated based on [schema.ts](/apps/web/src/lib/db/schema.ts)

1. Generate migration:

```bash
pnpm db:migrate
```

2. Apply migration:

```bash
pnpm db:generate [name/short description of migration]
```

## Codebase Overview

This project is built with:

- **TanStack Router** - File-based routing in `src/routes/`
- **TanStack Query** - Data fetching and state management
- **Tailwind CSS** - Styling
- **Vitest** - Testing

Key directories:

- `src/routes/` - Application routes
- `src/components/` - Reusable components
- `src/lib/` - Utilities and shared logic
