import { env } from "@/config/env";

type FeatureFlagContext = {
  userIdentifier?: string;
};

const featureFlags = {
  ANALYTICS_V2: env.ANALYTICS_V2_ACCESS,
} as const;

export type FeatureFlagsDTO = { [k in keyof typeof featureFlags]: boolean };

function isEnabled(name: keyof typeof featureFlags, ctx?: FeatureFlagContext) {
  let value = featureFlags[name];
  if (!value) return false;

  value = value.trim().toLowerCase();

  if (value.trim() === "") return false;
  if (value === "false" || value === "0") return false;
  if (value === "true" || value === "1") return true;

  if (!ctx || !ctx.userIdentifier) return false;

  let array = value.split(",").map((entry) => entry.trim());

  if (array.length === 0) return false;
  if (array.includes(ctx.userIdentifier)) return true;
  return false;
}

export const featureFlagService = {
  isEnabled,
};
