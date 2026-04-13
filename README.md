# Expense Tracker

A financial tracking application for managing income and expenses with analytics to help make better financial decisions.

Built as a PWA (Progressive Web App) first, but works seamlessly on desktop too.

## Live Apps

- Version 1: [ex.edvardsen.dev](https://ex.edvardsen.dev)
- Version 2 (Beta): [ex.v2.edvardsen.dev](https://ex.v2.edvardsen.dev)

## Setup

```bash
pnpm install
pnpm dev
```

## Building

```bash
pnpm build
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
