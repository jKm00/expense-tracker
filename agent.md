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

## Error handling

- Services/controllers should return ok/err. Each err should have a unique reason which will be used as a key when displaying error messages in the frontend.
- Make sure to always handle errors in the frontend. Both unexpected errors (errors returned/thrown from queries/mutations) and expected errors (when services/controller returns an err). All expected errors cases should be handled. Its fine to handle them the same way if it makes sense, as long as all are handled.

## Testing

- All services should be unit tested as this is where the business logic is.
- When testing, mock the DB so they can be ran without connecting to a real DB

## Database

When implementing things that affects the database table, NEVER write manual migrations. Just update the `schema.ts` files. A human will run the scripts to generate the migration based on the schema changes and apply them to the database after the implementation is done.

## General concepts

- Re-use logic if its already implemented (might be implemented in another feature)
- When feature A uses feature B, the service from feature A should only talk to the service of feature B, NEVER directly to the repo of feature B. Service of feature A is the only file/class that should talk directly to repo of feature A.
