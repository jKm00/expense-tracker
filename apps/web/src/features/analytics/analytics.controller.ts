import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "@/features/auth/auth.utils";
import { analyticsService } from "./analytics.service";
import { updateAnalyticsExclusionsSchema } from "./analytics.dtos";

const getPreferences = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return await analyticsService.getPreferences(context.user.id);
  });

const updateExclusions = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(updateAnalyticsExclusionsSchema)
  .handler(async ({ context, data }) => {
    return await analyticsService.updateExclusions(
      context.user.id,
      data.type,
      data.ids,
    );
  });

export const analyticsController = {
  getPreferences,
  updateExclusions,
};
