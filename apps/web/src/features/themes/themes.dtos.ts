import z from "zod";
import { THEME_MODES, THEME_PALETTE_IDS } from "./themes.constants";

export const updateThemeSchema = z.object({
  palette: z.enum(THEME_PALETTE_IDS),
  mode: z.enum(THEME_MODES),
});

export type UpdateThemeDTO = z.infer<typeof updateThemeSchema>;
