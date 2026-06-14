import { env } from "@/config/env";

export const featureFlags = {
  ANALYTICS_V2: env.ANALYTICS_V2_ACCESS,
} as const;
