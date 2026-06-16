import { CheckIcon, MoonIcon, SunIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { THEME_PALETTES, useTheme, type ThemeMode } from "./theme-provider";

const modes = [
  { id: "light", label: "Light", icon: SunIcon },
  { id: "dark", label: "Dark", icon: MoonIcon },
] as const;

export function ThemePicker() {
  const { palette, mode, setPalette, setMode } = useTheme();

  return (
    <div className="space-y-4">
      <div className="inline-grid grid-cols-2 rounded-xl border border-border bg-muted/50 p-1">
        {modes.map((item) => {
          const Icon = item.icon;
          const isSelected = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id as ThemeMode)}
              className={cn(
                "flex h-8 items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isSelected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={isSelected}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {THEME_PALETTES.map((item) => {
          const isSelected = palette === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPalette(item.id)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                isSelected ? "border-primary ring-2 ring-primary/15" : "border-border"
              )}
              aria-pressed={isSelected}
            >
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                <ThemePreview
                  swatches={item.lightSwatches}
                  active={mode === "light"}
                />
                <ThemePreview
                  swatches={item.darkSwatches}
                  active={mode === "dark"}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border text-primary-foreground transition-colors",
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-border bg-transparent text-transparent"
                  )}
                >
                  <CheckIcon className="size-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemePreview({
  swatches,
  active,
}: {
  swatches: readonly string[];
  active: boolean;
}) {
  const [background, primary, accent, card] = swatches;

  return (
    <div
      className={cn(
        "relative h-20 overflow-hidden rounded-xl border transition-all",
        active ? "border-primary/70" : "border-border/70 opacity-75"
      )}
      style={{ backgroundColor: background }}
    >
      <div
        className="absolute inset-x-0 top-0 h-5"
        style={{ backgroundColor: primary }}
      />
      <div
        className="absolute left-2 top-7 h-10 w-5 rounded-md"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute right-2 top-7 h-10 w-[calc(100%-40px)] rounded-lg shadow-sm"
        style={{ backgroundColor: card }}
      />
      <div
        className="absolute right-4 top-10 h-1.5 w-8 rounded-full"
        style={{ backgroundColor: primary }}
      />
      <div
        className="absolute right-4 top-14 h-1.5 w-5 rounded-full opacity-70"
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute right-3 top-2 size-2 rounded-full"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}
