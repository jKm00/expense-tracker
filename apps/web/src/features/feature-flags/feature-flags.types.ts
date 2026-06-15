import { featureFlags } from "./feature-flags.constants";

export type FeatureFlagContext = {
  userIdentifier?: string;
};

export type FeatureFlagsDTO = { [k in keyof typeof featureFlags]: boolean };
