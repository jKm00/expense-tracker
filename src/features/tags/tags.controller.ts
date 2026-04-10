import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { tagsService } from "./tags.service";
import { addTagSchema, deleteTagSchema } from "./tags.dtos";

const getTags = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await tagsService.getTags(userId);
  });

const addTag = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(addTagSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    return await tagsService.addTag({
      userId,
      ...data,
    });
  });

const deleteTag = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(deleteTagSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { tagId } = data;
    return await tagsService.deleteTag(userId, tagId);
  });

export const tagsController = {
  getTags,
  addTag,
  deleteTag,
};
