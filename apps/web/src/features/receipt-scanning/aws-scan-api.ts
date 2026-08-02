import { env } from "@/config/env";

type AwsError = { error?: { code?: string; message?: string } };

function assertConfigured() {
  if (!env.AWS_SCAN_API_URL || !env.AWS_SCAN_API_TOKEN) {
    throw new Error("Receipt scanning is not configured for this environment.");
  }
}

async function request<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
  assertConfigured();
  const response = await fetch(`${env.AWS_SCAN_API_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.AWS_SCAN_API_TOKEN}`,
      "x-user-id": userId,
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: AwsError = {};
    try {
      body = await response.json();
    } catch {}
    throw new Error(body.error?.message ?? "AWS scan request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}

export const awsScanApi = { request };
