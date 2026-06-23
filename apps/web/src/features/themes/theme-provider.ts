import * as React from "react";

export type ThemePaletteId =
  | "default"
  | "mocha"
  | "sage"
  | "clay"
  | "ocean"
  | "doom"
  | "synth"
  | "terminal";
export type ThemeMode = "light" | "dark";

export type ThemePalette = {
  id: ThemePaletteId;
  name: string;
  description: string;
  radius: string;
  lightSwatches: readonly string[];
  darkSwatches: readonly string[];
  metaColor: Record<ThemeMode, string>;
};

export const THEME_PALETTES = [
  {
    id: "default",
    name: "Classic",
    description: "Neutral finance UI with a warm gold accent.",
    radius: "0.625rem",
    lightSwatches: ["#F8F7F2", "#27272A", "#EFE6C8", "#FFFFFF"],
    darkSwatches: ["#212126", "#E9D9A8", "#3A3A42", "#15151A"],
    metaColor: { light: "#F8F7F2", dark: "#212126" },
  },
  {
    id: "mocha",
    name: "Mocha",
    description: "Espresso browns, cream surfaces, and roasted amber.",
    radius: "0.75rem",
    lightSwatches: ["#FBF1E5", "#6F432C", "#D7A86E", "#FFF9F0"],
    darkSwatches: ["#1E1715", "#E8C99B", "#8F5F3F", "#2F211B"],
    metaColor: { light: "#FBF1E5", dark: "#1E1715" },
  },
  {
    id: "sage",
    name: "Sage",
    description: "Botanical greens with calm paper-toned surfaces.",
    radius: "0.8rem",
    lightSwatches: ["#F4F6EF", "#48624A", "#DCE7D4", "#FFFFFF"],
    darkSwatches: ["#111A14", "#A8C7A1", "#2F4A35", "#18251C"],
    metaColor: { light: "#F4F6EF", dark: "#111A14" },
  },
  {
    id: "clay",
    name: "Clay",
    description: "Terracotta, peach, and grounded desert neutrals.",
    radius: "1rem",
    lightSwatches: ["#FCF4EC", "#A6462D", "#F1D1BE", "#FFF9F4"],
    darkSwatches: ["#201514", "#F0A083", "#743729", "#2D1D1A"],
    metaColor: { light: "#FCF4EC", dark: "#201514" },
  },
  {
    id: "doom",
    name: "Doom",
    description: "Industrial reds, scorched metal, and molten warning glow.",
    radius: "0px",
    lightSwatches: [
      "oklch(0.8452 0 0)",
      "oklch(0.5016 0.1887 27.4816)",
      "oklch(0.588 0.0993 245.7394)",
      "oklch(0.7572 0 0)",
    ],
    darkSwatches: [
      "oklch(0.2178 0 0)",
      "oklch(0.6083 0.209 27.0276)",
      "oklch(0.7482 0.1235 244.7492)",
      "oklch(0.285 0 0)",
    ],
    metaColor: { light: "#B7B7B7", dark: "#222222" },
  },
  {
    id: "synth",
    name: "Synth",
    description: "Neon magenta, electric cyan, and midnight club energy.",
    radius: "0.9rem",
    lightSwatches: ["#FFF0FB", "#C026D3", "#06B6D4", "#FFFFFF"],
    darkSwatches: ["#12071F", "#F0ABFC", "#22D3EE", "#241038"],
    metaColor: { light: "#FFF0FB", dark: "#12071F" },
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Green phosphor, command-line contrast, and hacker utility.",
    radius: "0.125rem",
    lightSwatches: [
      "oklch(0.9491 0.0085 197.0126)",
      "oklch(0.5624 0.0947 203.2755)",
      "oklch(0.9021 0.0297 201.8915)",
      "oklch(0.9724 0.0053 197.0692)",
    ],
    darkSwatches: [
      "oklch(0.2068 0.0247 224.4533)",
      "oklch(0.852 0.1269 195.0354)",
      "oklch(0.3775 0.0564 216.501)",
      "oklch(0.2293 0.0276 216.0674)",
    ],
    metaColor: { light: "#EDF3F3", dark: "#18242D" },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Crisp social blues, rounded cards, and high-contrast feeds.",
    radius: "1.3rem",
    lightSwatches: [
      "oklch(1 0 0)",
      "oklch(0.6723 0.1606 244.9955)",
      "oklch(0.9392 0.0166 250.8453)",
      "oklch(0.9784 0.0011 197.1387)",
    ],
    darkSwatches: [
      "oklch(0 0 0)",
      "oklch(0.6692 0.1607 245.011)",
      "oklch(0.1928 0.0331 242.5459)",
      "oklch(0.2097 0.008 274.5332)",
    ],
    metaColor: { light: "#FFFFFF", dark: "#000000" },
  },
] as const satisfies readonly ThemePalette[];

const PALETTE_STORAGE_KEY = "expense-tracker-theme-palette";
const MODE_STORAGE_KEY = "expense-tracker-theme-mode";
const LEGACY_THEME_STORAGE_KEY = "expense-tracker-theme";
const PALETTE_IDS = THEME_PALETTES.map((theme) => theme.id);
const META_COLORS = Object.fromEntries(
  THEME_PALETTES.map((theme) => [theme.id, theme.metaColor])
);

type ThemeContextValue = {
  palette: ThemePaletteId;
  mode: ThemeMode;
  theme: ThemeMode;
  setPalette: (palette: ThemePaletteId) => void;
  setMode: (mode: ThemeMode) => void;
  setTheme: (mode: ThemeMode) => void;
  palettes: readonly ThemePalette[];
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: string;
  attribute?: string;
  enableSystem?: boolean;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isPaletteId(value: string | null | undefined): value is ThemePaletteId {
  return PALETTE_IDS.includes(value as ThemePaletteId);
}

function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

function getInitialPalette(): ThemePaletteId {
  if (typeof window === "undefined") return "default";

  const palette = window.localStorage.getItem(PALETTE_STORAGE_KEY);
  if (isPaletteId(palette)) return palette;

  const legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  return isPaletteId(legacyTheme) ? legacyTheme : "default";
}

function getInitialMode(defaultTheme: string): ThemeMode {
  if (typeof window === "undefined") {
    return isThemeMode(defaultTheme) ? defaultTheme : "dark";
  }

  const mode = window.localStorage.getItem(MODE_STORAGE_KEY);
  if (isThemeMode(mode)) return mode;

  const legacyTheme = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  return isThemeMode(legacyTheme) ? legacyTheme : "dark";
}

function applyTheme(paletteId: ThemePaletteId, mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const palette =
    THEME_PALETTES.find((item) => item.id === paletteId) ?? THEME_PALETTES[0];
  const root = document.documentElement;
  root.classList.remove(
    "light",
    "dark",
    ...PALETTE_IDS.map((id) => `theme-${id}`)
  );
  root.classList.add(mode, `theme-${palette.id}`);
  root.dataset.theme = palette.id;
  root.dataset.themeMode = mode;
  root.style.colorScheme = mode;

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", palette.metaColor[mode]);
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: ThemeProviderProps) {
  const [palette, setPaletteState] =
    React.useState<ThemePaletteId>(getInitialPalette);
  const [mode, setModeState] = React.useState<ThemeMode>(() =>
    getInitialMode(defaultTheme)
  );

  React.useEffect(() => {
    applyTheme(palette, mode);
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette);
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [palette, mode]);

  const setPalette = React.useCallback((nextPalette: ThemePaletteId) => {
    setPaletteState(isPaletteId(nextPalette) ? nextPalette : "default");
  }, []);

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    setModeState(isThemeMode(nextMode) ? nextMode : "dark");
  }, []);

  const value = React.useMemo(
    () => ({
      palette,
      mode,
      theme: mode,
      setPalette,
      setMode,
      setTheme: setMode,
      palettes: THEME_PALETTES,
    }),
    [palette, mode, setPalette, setMode]
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function ThemeScript() {
  const script = `
    (function() {
      try {
        var paletteIds = ${JSON.stringify(PALETTE_IDS)};
        var metaColors = ${JSON.stringify(META_COLORS)};
        var palette = window.localStorage.getItem(${JSON.stringify(PALETTE_STORAGE_KEY)});
        var mode = window.localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});
        var legacyTheme = window.localStorage.getItem(${JSON.stringify(LEGACY_THEME_STORAGE_KEY)});
        if (paletteIds.indexOf(palette) === -1) palette = paletteIds.indexOf(legacyTheme) === -1 ? "default" : legacyTheme;
        if (mode !== "light" && mode !== "dark") mode = legacyTheme === "light" ? "light" : "dark";
        var root = document.documentElement;
        root.classList.remove("light", "dark"${PALETTE_IDS.map((id) => `, "theme-${id}"`).join("")});
        root.classList.add(mode, "theme-" + palette);
        root.dataset.theme = palette;
        root.dataset.themeMode = mode;
        root.style.colorScheme = mode;
        var themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) themeColor.setAttribute("content", metaColors[palette][mode]);
      } catch (_) {}
    })();
  `;

  return React.createElement("script", {
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: { __html: script },
  });
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
