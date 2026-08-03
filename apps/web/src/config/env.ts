export const env = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  RECURRING_JOB_TOKEN: process.env.RECURRING_JOB_TOKEN || "",
  ADMINS: process.env.ADMINS || "",
  AWS_SCAN_API_URL: process.env.AWS_SCAN_API_URL || "",
  AWS_SCAN_API_TOKEN: process.env.AWS_SCAN_API_TOKEN || "",
  // Feature Flags
  EXAMPLE: process.env.EXAMPLE || "false",
  SCORING_SYSTEM: process.env.SCORING_SYSTEM || "false",
} as const;
