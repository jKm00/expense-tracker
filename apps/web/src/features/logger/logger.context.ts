import { AsyncLocalStorage } from "node:async_hooks";
import { RequestLogContext } from "./logger.types";
import pino from "pino";

const baseLogger = pino();

const als = new AsyncLocalStorage<RequestLogContext>();

export function runWithLogContext<T>(ctx: RequestLogContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getLogger() {
  const ctx = als.getStore();

  return {
    addAttrs(attrs: Record<string, unknown>) {
      if (!ctx) return;
      Object.assign(ctx.attrs, attrs);
    },
    info(message: string, attrs?: Record<string, unknown>) {
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
