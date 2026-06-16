import { featureFlags } from "@/features/feature-flags/server/feature-flags.constants";

export type FeatureFlagContext = {
  userIdentifier?: string;
};

export type FeatureFlagsDTO = { [k in keyof typeof featureFlags]: boolean };
