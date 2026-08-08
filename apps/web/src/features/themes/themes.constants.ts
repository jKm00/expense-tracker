export const THEME_PALETTE_IDS = [
  "default",
  "mocha",
  "sage",
  "clay",
  "ocean",
  "doom",
  "synth",
  "terminal",
] as const;

export const THEME_MODES = ["light", "dark"] as const;

export type ThemePaletteId = (typeof THEME_PALETTE_IDS)[number];
export type ThemeMode = (typeof THEME_MODES)[number];

export function isThemePaletteId(value: unknown): value is ThemePaletteId {
  return THEME_PALETTE_IDS.includes(value as ThemePaletteId);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}
