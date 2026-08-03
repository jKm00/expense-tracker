import { env } from "@/config/env";
import { RECEIPT_SCAN_SERVICE_UNAVAILABLE_MESSAGE } from "./receipt-scanning.utils";

type AwsError = { error?: { code?: string; message?: string } };

function assertConfigured() {
  if (!env.AWS_SCAN_API_URL || !env.AWS_SCAN_API_TOKEN) {
    throw new Error("Receipt scanning is not configured for this environment.");
  }
}

async function request<T>(userId: string, path: string, init?: RequestInit): Promise<T> {
  assertConfigured();
  let response: Response;
  try {
    response = await fetch(`${env.AWS_SCAN_API_URL}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${env.AWS_SCAN_API_TOKEN}`,
        "x-user-id": userId,
        "content-type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(RECEIPT_SCAN_SERVICE_UNAVAILABLE_MESSAGE);
  }

  if (!response.ok) {
    let body: AwsError = {};
    try {
      body = await response.json();
    } catch {}
    throw new Error(body.error?.message ?? "Receipt scanning request failed. The scan service returned an unexpected response. Please try again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json() as T;
}

export const awsScanApi = { request };
