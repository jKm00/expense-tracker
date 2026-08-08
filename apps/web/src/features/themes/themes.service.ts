import { ok } from "@/utils/result";
import { err } from "@/features/logger/logger.result";
import { getLogger } from "@/features/logger/logger.context";
import { THEME_MODES, THEME_PALETTE_IDS } from "./themes.constants";
import { UpdateThemeDTO } from "./themes.dtos";
import { ThemePreference } from "./themes.models";
import { themesRepo } from "./themes.repo";

const DEFAULT_THEME: ThemePreference = { palette: "default", mode: "dark" };

function normalizeTheme(theme: {
  palette: string;
  mode: string;
}): ThemePreference | null {
  if (
    !THEME_PALETTE_IDS.includes(theme.palette as ThemePreference["palette"]) ||
    !THEME_MODES.includes(theme.mode as ThemePreference["mode"])
  ) {
    return null;
  }

  return {
    palette: theme.palette as ThemePreference["palette"],
    mode: theme.mode as ThemePreference["mode"],
  };
}

async function getTheme(userId: string) {
  const logger = getLogger();
  logger.addAttrs({ themeAction: "getTheme" });

  try {
    const prefs = await themesRepo.getPreferences(userId);
    const theme = prefs ? normalizeTheme(prefs) ?? DEFAULT_THEME : DEFAULT_THEME;
    logger.addAttrs({
      themePalette: theme.palette,
      themeMode: theme.mode,
    });
    return ok(theme);
  } catch (error) {
    return err({
      reason: "THEME_DB_ERROR" as const,
      message: "Failed to load the theme preference",
    });
  }
}

async function updateTheme(userId: string, input: UpdateThemeDTO) {
  const logger = getLogger();
  logger.addAttrs({ themeAction: "updateTheme" });

  try {
    const prefs = await themesRepo.upsertPreferences(userId, input);
    const theme = prefs ? normalizeTheme(prefs) ?? DEFAULT_THEME : DEFAULT_THEME;
    logger.addAttrs({
      themePalette: theme.palette,
      themeMode: theme.mode,
    });
    return ok(theme);
  } catch (error) {
    return err({
      reason: "THEME_DB_ERROR" as const,
      message: "Failed to save the theme preference",
    });
  }
}

export const themesService = {
  getTheme,
  updateTheme,
};
