import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "../auth/auth.utils";
import { homeService } from "./home.service";
import { saveHomeConfigSchema } from "./home.dtos";

const getHomeWidgets = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return await homeService.getHomeWidgets(context.user.id);
  });

const saveHomeConfig = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(saveHomeConfigSchema)
  .handler(async ({ context, data }) => {
    return await homeService.saveHomeConfig(context.user.id, data);
  });

export const homeController = {
  getHomeWidgets,
  saveHomeConfig,
};
