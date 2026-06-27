export const env = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  RECURRING_JOB_TOKEN: process.env.RECURRING_JOB_TOKEN || "",
  ADMINS: process.env.ADMINS || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_RECEIPT_MODEL: process.env.OPENAI_RECEIPT_MODEL || "gpt-4o-mini",
  // Feature Flags
  EXAMPLE: process.env.EXAMPLE || "false",
} as const;
