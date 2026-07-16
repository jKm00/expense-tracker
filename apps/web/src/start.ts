import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { loggingMiddleware } from "./features/logger/logger.middleware";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, loggingMiddleware],
}));
