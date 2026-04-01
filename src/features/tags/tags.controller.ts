import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { tagsService } from "./tags.service";

const getTags = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    const userId = context.user.id;
    return await tagsService.getTags(userId);
  });

export const tagsController = {
  getTags,
};
