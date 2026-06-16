import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const isDark = mode === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setMode(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="size-8"
    >
      <SunIcon className="size-4 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
      <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
