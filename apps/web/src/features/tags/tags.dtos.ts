import z from "zod";

export const getTagSchema = z.object({
  tagId: z.string(),
});

export type GetTagDTO = z.infer<typeof getTagSchema>;

export const listTagsSchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export type ListTagsDTO = z.infer<typeof listTagsSchema>;

export const addTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
});

export type AddTagDTO = z.infer<typeof addTagSchema>;

export const updateTagSchema = z.object({
  tagId: z.string(),
  name: z.string().min(1, "Name is required").optional(),
  color: z.string().optional(),
});

export type UpdateTagDTO = z.infer<typeof updateTagSchema>;

export const deleteTagSchema = z.object({
  tagId: z.string(),
});

export type DeleteTagDTO = z.infer<typeof deleteTagSchema>;
