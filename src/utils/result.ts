export type Result<E extends { reason: string }, S> = [E, null] | [null, S];

export function ok<S>(data: S): Result<never, S> {
  return [null, data];
}

export function error<const R extends string, E extends { reason: R }>(
  error: E,
): Result<E, never> {
  return [error, null];
}
