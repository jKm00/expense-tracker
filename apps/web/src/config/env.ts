export const env = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  RECURRING_JOB_TOKEN: process.env.RECURRING_JOB_TOKEN || "",
  INTEGRATION_BETA_BADGE: process.env.INTEGRATION_BETA_BADGE ?? "true",
  SHOPPING_BETA_BADGE: process.env.SHOPPING_BETA_BADGE ?? "true",
  ANALYTICS_V2_ACCESS: process.env.ANALYTICS_V2_ACCESS,
} as const;
