import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { tagsService } from "./tags.service";
import { addTagSchema } from "./tags.dtos";

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

export const tagsController = {
  getTags,
  addTag,
};
