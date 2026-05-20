import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") }); // apps/job/.env.local
config({ path: resolve(__dirname, "../.env") }); // apps/job/.env

interface JobRunResponse {
  ok: boolean;
  created?: number;
  skipped?: number;
  date?: string;
  error?: string;
}

function isJobRunResponse(value: unknown): value is JobRunResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.ok === "boolean";
}

async function main() {
  const apiEndpoint = process.env.API_ENDPOINT;
  if (!apiEndpoint) {
    console.error("API_ENDPOINT environment variable is required");
    process.exit(1);
  }

  const recurringJobToken = process.env.RECURRING_JOB_TOKEN;
  if (!recurringJobToken) {
    console.error("RECURRING_JOB_TOKEN environment variable is required");
    process.exit(1);
  }

  console.log(`[recurring-job] Triggering ${apiEndpoint}`);

  try {
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "x-job-token": recurringJobToken,
      },
    });

    const body = await response.json();

    if (!isJobRunResponse(body)) {
      console.error("[recurring-job] Unexpected response body:", body);
      process.exit(1);
    }

    if (!response.ok || !body.ok) {
      console.error("[recurring-job] Request failed:", {
        status: response.status,
        body,
      });
      process.exit(1);
    }

    console.log(
      `[recurring-job] Done for ${body.date}. Created ${body.created} transactions, skipped ${body.skipped}.`,
    );
    process.exit(0);
  } catch (error) {
    console.error("[recurring-job] Fatal error:", error);
    process.exit(1);
  }
}

main();
