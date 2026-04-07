import { config } from "dotenv";
import { definePlugin } from "nitro";

// Load .env files at module initialization time.
// This runs during static imports — BEFORE useNitroApp() is called,
// and BEFORE any SSR handler or DB module is lazily loaded.
config({ path: [".env.local", ".env"] });

export default definePlugin(() => {
  // No-op: dotenv loading is done above at module init time.
  // This plugin exists solely to be registered in Nitro's plugin system,
  // which causes this module to be statically imported at server startup.
});
