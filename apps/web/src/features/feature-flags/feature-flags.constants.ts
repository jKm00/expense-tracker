import { env } from "@/config/env";

export const featureFlags = {
  example: env.EXAMPLE,
  scoringSystem: env.SCORING_SYSTEM,
};
