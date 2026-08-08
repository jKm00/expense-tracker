import { createServerFn } from "@tanstack/react-start";
import { authenticated } from "@/features/auth/auth.utils";
import { updateThemeSchema } from "./themes.dtos";
import { themesService } from "./themes.service";

const getTheme = createServerFn({ method: "GET" })
  .middleware([authenticated])
  .handler(async ({ context }) => {
    return await themesService.getTheme(context.user.id);
  });

const updateTheme = createServerFn({ method: "POST" })
  .middleware([authenticated])
  .validator(updateThemeSchema)
  .handler(async ({ context, data }) => {
    return await themesService.updateTheme(context.user.id, data);
  });

export const themesController = {
  getTheme,
  updateTheme,
};
