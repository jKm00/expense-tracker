# Agent Instructions

Use `pnpm` instead of `npm` for package management.

## Feature

The web app encapsulates implementation into features. They consists of:

- components/: Frontend UI Components
- controller: tanstack server functions (like endpoints)
- service: business logic
- repo: data source communication
- dtos: types between frontend and backend
- models: business models
- schema: db schema
- validations: model validations
- queries: tanstack queries
- mutations: tanstack mutations
- utils: utility functions

It's important to follow this structure to make sure each thing handles one responsibility. Files should be follow naming convention: `<feature>.<type>.ts(x)`

## General concepts

- Re-use logic if its already implemented (might be implemented in another feature)
- When feature A uses feature B, the service from feature A should only talk to the service of feature B, NEVER directly to the repo of feature B. Service of feature A is the only file/class that should talk directly to repo of feature A.
