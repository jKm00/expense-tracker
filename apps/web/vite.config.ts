import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { fileURLToPath, URL } from "url";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig(({ mode }) => {
  const isTest = mode === "test" || process.env.VITEST === "true";

  return {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      environment: "node",
      globals: false,
      exclude: [".worktrees/**", "node_modules/**", ".opencode/**"],
      // Ensure React module instance is shared between ESM imports and CJS requires.
      // See src/test-setup.ts for the explanation.
      setupFiles: ["./src/test-setup.ts"],
    },
    plugins: [
      !isTest && devtools(),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      !isTest && tanstackStart(),
      viteReact(),
      !isTest &&
        nitro({
          plugins: ["./src/server-plugins/env.ts"],
        }),
    ],
  };
});

export default config;
