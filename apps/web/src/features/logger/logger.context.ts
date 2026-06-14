import { RequestLogContext } from "./logger.types";
import pino from "pino";

const baseLogger = pino();

type RequestAsyncLocalStorage = import("node:async_hooks").AsyncLocalStorage<RequestLogContext>;

let als: RequestAsyncLocalStorage | undefined;

async function getAsyncLocalStorage() {
  if (!als) {
    const { AsyncLocalStorage } = await import("node:async_hooks");
    als = new AsyncLocalStorage<RequestLogContext>();
  }

  return als;
}

export async function runWithLogContext<T>(
  ctx: RequestLogContext,
  fn: () => T,
): Promise<T> {
  const store = await getAsyncLocalStorage();
  return store.run(ctx, fn);
}

export function getLogger() {
  const ctx = als?.getStore();

  const shouldLogInfo = () => {
    if (!ctx) return true;
    return ctx.sampled;
  };

  return {
    addAttrs(attrs: Record<string, unknown>) {
      if (!ctx) return;
      Object.assign(ctx.attrs, attrs);
    },
    info(message: string, attrs?: Record<string, unknown>) {
      if (!shouldLogInfo()) return;

      baseLogger.info(
        {
          requestId: ctx?.requestId,
          ...ctx?.attrs,
          ...attrs,
        },
        message,
      );
    },
    error(message: string, attrs?: Record<string, unknown>) {
      baseLogger.error(
        {
          requestId: ctx?.requestId,
          ...ctx?.attrs,
          ...attrs,
        },
        message,
      );
    },
  };
}
