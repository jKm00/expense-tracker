import { createMiddleware } from "@tanstack/react-start";
import { getLogger, runWithLogContext } from "./logger.context";
import { RequestLogContext } from "./logger.types";

export const loggingMiddleware = createMiddleware().server(
  async ({ request, pathname, next }) => {
    const ctx: RequestLogContext = {
      requestId: crypto.randomUUID(),
      sampled: Math.random() < 0.2,
      attrs: {
        method: request.method,
        path: pathname,
      },
    };

    const startedAt = Date.now();

    return await runWithLogContext(ctx, async () => {
      try {
        const result = await next();

        const status =
          result instanceof Response ? result.status : result.response?.status;

        const durationMs = Date.now() - startedAt;

        const shouldLog = ctx.sampled || status >= 400 || durationMs > 1000;

        if (shouldLog) {
          getLogger().info("Request completed", {
            status,
            durationMs,
            sampled: ctx.sampled,
          });
        }

        return result;
      } catch (error) {
        getLogger().error("Request failed", {
          status: 500,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
          sampled: ctx.sampled,
        });

        throw error;
      }
    });
  },
);
