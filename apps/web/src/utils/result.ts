export type Result<E extends { reason: string }, S> = [E, null] | [null, S];

let errorHook: ((error: { reason: string }) => void) | undefined;

export function setResultErrorHook(hook: (error: { reason: string }) => void) {
  errorHook = hook;
}

export function ok<S>(data: S): Result<never, S> {
  return [null, data];
}

export function err<const R extends string, E extends { reason: R }>(
  error: E,
): Result<E, never> {
  errorHook?.(error);
  return [error, null];
}
