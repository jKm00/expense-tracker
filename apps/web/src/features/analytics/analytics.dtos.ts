import z from "zod";

export const analyticsExclusionTypeSchema = z.enum(["tag", "product"]);

export const updateAnalyticsExclusionsSchema = z.object({
  type: analyticsExclusionTypeSchema,
  ids: z.string().array(),
});

export type AnalyticsExclusionType = z.infer<typeof analyticsExclusionTypeSchema>;
export type UpdateAnalyticsExclusionsDTO = z.infer<
  typeof updateAnalyticsExclusionsSchema
>;
