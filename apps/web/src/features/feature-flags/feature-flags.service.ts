import { getLogger } from "../logger/logger.context";
import { featureFlags } from "./feature-flags.constants";
import { FeatureFlagContext, FeatureFlagsDTO } from "./feature-flags.types";

function getAll(ctx?: FeatureFlagContext): FeatureFlagsDTO {
  const result = {} as FeatureFlagsDTO;

  (Object.keys(featureFlags) as Array<keyof typeof featureFlags>).forEach(
    (key) => {
      result[key] = isEnabled(key, ctx);
    },
  );

  return result;
}

function isEnabled(name: keyof typeof featureFlags, ctx?: FeatureFlagContext) {
  const logger = getLogger();
  logger.addAttrs({ featureFlagAction: "isEnabled", featureFlagName: name });

  let value = featureFlags[name];
  if (!value) {
    logger.addAttrs({
      featureFlagEnabled: false,
      featureFlagReason: "Name not found",
    });
    return false;
  }

  value = value.trim().toLowerCase();

  if (value.trim() === "") {
    logger.addAttrs({
      featureFlagEnabled: false,
      featureFlagReason: "Empty string",
    });
    return false;
  }
  if (value === "false" || value === "0") {
    logger.addAttrs({
      featureFlagEnabled: false,
      featureFlagReason: "False or 0",
    });
    return false;
  }
  if (value === "true" || value === "1") {
    logger.addAttrs({
      featureFlagEnabled: true,
      featureFlagReason: "True or 1",
    });
    return true;
  }

  if (!ctx || !ctx.userIdentifier) {
    logger.addAttrs({
      featureFlagEnabled: false,
      featureFlagReason: "Requires user context",
    });
    return false;
  }

  let array = value.split(",").map((entry) => entry.trim());

  if (array.length === 0) {
    logger.addAttrs({
      featureFlagEnabled: false,
      featureFlagReason: "Empty list",
    });
    return false;
  }
  if (array.includes(ctx.userIdentifier.toLowerCase())) {
    logger.addAttrs({
      featureFlagEnabled: true,
      featureFlagReason: "User match",
    });
    return true;
  }
  logger.addAttrs({
    featureFlagEnabled: false,
    featureFlagReason: "No match, defaulting to disabled",
  });
  return false;
}

export const featureFlagService = {
  isEnabled,
  getAll,
};
