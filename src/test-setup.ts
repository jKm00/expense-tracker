/**
 * Vitest setup: Ensure React hooks work correctly in tests.
 *
 * Problem: In vitest's module system, `import { useSyncExternalStore } from "react"`
 * (ESM path through Vite) and `require("react")` (CJS Node.js path) can resolve to
 * DIFFERENT React module instances. When react-dom (CJS) sets the hook dispatcher on
 * its React internals, our ESM hooks read from a different React internals object and
 * see a null dispatcher, causing "Invalid hook call" errors with @testing-library/react.
 *
 * Fix: Use vi.mock to intercept all `import "react"` calls and redirect them to the
 * actual CJS require(react) object. This ensures that react-dom's dispatcher setup
 * is visible to all React hooks, regardless of whether they were imported via ESM or CJS.
 */
import { vi } from 'vitest'

vi.mock('react', async () => {
  // `require` here goes through Node's CJS module cache — same instance that
  // react-dom/client uses when it sets the dispatcher. By returning this same
  // object from vi.mock, all ESM `import "react"` calls get the identical module
  // instance, making React.useSyncExternalStore and friends work in renderHook.
  const ReactCJS = require('react')
  return {
    ...ReactCJS,
    default: ReactCJS,
    __esModule: true,
  }
})
