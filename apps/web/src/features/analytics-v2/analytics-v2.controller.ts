import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { analyticsV2Service } from "./analytics-v2.service";
import { featureFlagService } from "../feature-flags/feature-flags.service";
import { err } from "@/utils/result";
import { getDashboardDataSchema } from "./analytics-v2.dtos";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getDashboardDataSchema)
  .handler(async ({ context, data }) => {
    const enabled = featureFlagService.isEnabled("ANALYTICS_V2", {
      userIdentifier: context.user.email,
    });
    if (!enabled) {
      return err({
        reason: "ANALYTICS_V2_FORBIDDEN",
        message: "You do not have access to this feature",
      });
    }

    const userId = context.user.id;
    const { year, month, tagIds } = data;
    return await analyticsV2Service.getDashboardData(
      userId,
      year,
      month,
      tagIds,
    );
  });
