export const env = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  BASE_URL: process.env.BASE_URL || "",
  RECURRING_JOB_TOKEN: process.env.RECURRING_JOB_TOKEN || "",
} as const;
