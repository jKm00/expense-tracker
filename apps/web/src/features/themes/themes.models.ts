import type { ThemeMode, ThemePaletteId } from "./themes.constants";

export type ThemePreference = {
  palette: ThemePaletteId;
  mode: ThemeMode;
};
