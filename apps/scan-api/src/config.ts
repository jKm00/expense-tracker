function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumberEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  apiToken: () => requireEnv("API_TOKEN"),
  tableName: () => requireEnv("SCAN_TABLE_NAME"),
  bucketName: () => requireEnv("SCAN_BUCKET_NAME"),
  uploadUrlTtlSeconds: () => optionalNumberEnv("UPLOAD_URL_TTL_SECONDS", 600),
  fileUrlTtlSeconds: () => optionalNumberEnv("FILE_URL_TTL_SECONDS", 900),
  maxFileSizeBytes: () => optionalNumberEnv("MAX_FILE_SIZE_BYTES", 10 * 1024 * 1024),
  dailyLimit: () => optionalNumberEnv("DAILY_SCAN_LIMIT", 5),
};
