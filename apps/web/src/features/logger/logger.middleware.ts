import { createMiddleware } from "@tanstack/react-start";
import { getLogger, runWithLogContext } from "./logger.context";
import { RequestLogContext } from "./logger.types";

export const loggingMiddleware = createMiddleware().server(
  async ({ request, pathname, next }) => {
    const ctx: RequestLogContext = {
      requestId: crypto.randomUUID(),
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

        getLogger().info("Request completed", {
          status,
          durationMs: Date.now() - startedAt,
        });

        return result;
      } catch (error) {
        getLogger().error("Request failed", {
          status: 500,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }
    });
  },
);
