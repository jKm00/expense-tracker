import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { tagService } from "./tag.service";

const getTags = createServerFn()
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await tagService.getTags(userId);
  });

export const tagController = {
  getTags,
};
