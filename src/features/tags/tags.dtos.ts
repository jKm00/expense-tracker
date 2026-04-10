import z from "zod";

export const addTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
});

export type AddTagDTO = z.infer<typeof addTagSchema>;

export const deleteTagSchema = z.object({
  tagId: z.string(),
});

export type DeleteTagDTO = z.infer<typeof deleteTagSchema>;
