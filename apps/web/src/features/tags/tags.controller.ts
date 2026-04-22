import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { tagsService } from "./tags.service";
import {
  addTagSchema,
  deleteTagSchema,
  getTagSchema,
  updateTagSchema,
} from "./tags.dtos";

const getTags = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await tagsService.getTags(userId);
  });

const getTag = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .inputValidator(getTagSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const tagId = data.tagId;
    return await tagsService.getTag(userId, tagId);
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

const updateTag = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .inputValidator(updateTagSchema)
  .handler(async ({ context, data }) => {
    const userId = context.user.id;
    const { tagId, ...updateData } = data;
    return await tagsService.updateTag(userId, tagId, updateData);
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
  getTag,
  addTag,
  updateTag,
  deleteTag,
};
