import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { analyticsV2Service } from "./analytics-v2.service";
import { z } from "zod";

export const getDashboardDataSchema = z.object({
  year: z.number().optional(),
  month: z.number().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getDashboardDataSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { year, month, tagIds } = data;
    return await analyticsV2Service.getDashboardData(userId, year, month, tagIds);
  });
