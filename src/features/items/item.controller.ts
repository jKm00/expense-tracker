import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { itemService } from "./item.service";

const getAll = createServerFn()
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return await itemService.getAll(context.user.id);
  });

export const itemController = {
  getAll,
};
