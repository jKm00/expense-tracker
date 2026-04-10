export class OfflineError extends Error {
  constructor() {
    super("You're offline. Please reconnect to save changes.");
    this.name = "OfflineError";
  }
}

/**
 * Throws an OfflineError if the browser is currently offline.
 * Call this at the start of every mutation function to prevent
 * server calls while offline.
 *
 * @throws {OfflineError} when navigator.onLine is false
 */
export function assertOnline(): void {
  if (!navigator.onLine) {
    throw new OfflineError();
  }
}
