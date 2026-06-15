import { createServerFn } from "@tanstack/react-start";
import { adminAuthenticated } from "../auth/auth.utils";
import { analyticsV2Service } from "./analytics-v2.service";
import { getDashboardDataSchema } from "./analytics-v2.dtos";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([adminAuthenticated])
  .inputValidator(getDashboardDataSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { year, month, tagIds } = data;
    return await analyticsV2Service.getDashboardData(
      userId,
      year,
      month,
      tagIds,
    );
  });
