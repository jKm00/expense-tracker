import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { featureFlagService } from "./feature-flags.service";

const getFeatureFlags = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return featureFlagService.getAll({
      userIdentifier: context.user.email.toLowerCase(),
    });
  });

export const featureFlagController = {
  getFeatureFlags,
};
