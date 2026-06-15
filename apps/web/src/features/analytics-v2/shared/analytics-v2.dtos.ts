import z from "zod";

export const getDashboardDataSchema = z.object({
  year: z.number().optional(),
  month: z.number().optional(),
  tagIds: z.array(z.string()).optional(),
});
