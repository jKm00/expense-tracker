import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const config = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    VitePWA({
      // generateSW: Workbox auto-generates the service worker.
      // No custom src/service-worker.ts file needed.
      strategies: 'generateSW',
      // 'prompt': exposes needRefresh via virtual:pwa-register/react
      // so we can show an "Update available" toast (see ReloadPrompt component).
      registerType: 'prompt',
      // We provide our own public/manifest.json — don't generate one.
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Exclude TanStack Start server function calls from SW interception.
        // Server functions use POST to /_server/* which Workbox can't cache.
        navigateFallbackDenylist: [/^\/_server/],
      },
    }),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
