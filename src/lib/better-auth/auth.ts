import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "@/config/env";
import { db } from "@/lib/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [tanstackStartCookies()],
});
