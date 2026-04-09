import z from "zod";

export const addTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
});

export type AddTagDTO = z.infer<typeof addTagSchema>;
