import { config } from "dotenv";
import { definePlugin } from "nitro";

config({ path: [".env.local", ".env"] });

export default definePlugin(() => {});
