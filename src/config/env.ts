export const env = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
} as const;
