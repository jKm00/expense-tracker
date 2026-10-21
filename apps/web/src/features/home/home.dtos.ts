import z from "zod";
import { homeWidgetTypes } from "./home.models";

export const saveHomeConfigSchema = z.object({
  widgets: z
    .array(
      z.object({
        type: z.enum(homeWidgetTypes),
        enabled: z.boolean(),
      }),
    )
    .refine(
      (widgets) =>
        widgets.length === homeWidgetTypes.length &&
        new Set(widgets.map((w) => w.type)).size === homeWidgetTypes.length,
      "Each widget must be listed exactly once",
    ),
  shortcutIds: z.array(z.string()).max(100),
});

export type SaveHomeConfigDTO = z.infer<typeof saveHomeConfigSchema>;
