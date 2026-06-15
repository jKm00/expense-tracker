import { createStart } from "@tanstack/react-start";
import { loggingMiddleware } from "./features/logger/logger.middleware";

export const startInstance = createStart(() => ({
  requestMiddleware: [loggingMiddleware],
}));
