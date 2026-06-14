import { env } from "@/config/env";
import { getLogger } from "../logger/logger.context";

type FeatureFlagContext = {
  userIdentifier?: string;
};

const featureFlags = {
  ANALYTICS_V2: env.ANALYTICS_V2_ACCESS,
} as const;

export type FeatureFlagsDTO = { [k in keyof typeof featureFlags]: boolean };

function isEnabled(name: keyof typeof featureFlags, ctx?: FeatureFlagContext) {
  const logger = getLogger();
  logger.addAttrs({ featureFlagAction: "isEnabled", featureFlagName: name });

  let value = featureFlags[name];
  if (!value) {
    logger.addAttrs({ featureFlagEnabled: false });
    return false;
  }

  value = value.trim().toLowerCase();

  if (value.trim() === "") {
    logger.addAttrs({ featureFlagEnabled: false });
    return false;
  }
  if (value === "false" || value === "0") {
    logger.addAttrs({ featureFlagEnabled: false });
    return false;
  }
  if (value === "true" || value === "1") {
    logger.addAttrs({ featureFlagEnabled: true });
    return true;
  }

  if (!ctx || !ctx.userIdentifier) {
    logger.addAttrs({ featureFlagEnabled: false, featureFlagRequiresUser: true });
    return false;
  }

  let array = value.split(",").map((entry) => entry.trim());

  if (array.length === 0) {
    logger.addAttrs({ featureFlagEnabled: false });
    return false;
  }
  if (array.includes(ctx.userIdentifier)) {
    logger.addAttrs({ featureFlagEnabled: true });
    return true;
  }
  logger.addAttrs({ featureFlagEnabled: false });
  return false;
}

export const featureFlagService = {
  isEnabled,
};
