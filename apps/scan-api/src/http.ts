import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { z } from "zod";

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "conflict"
  | "internal_error";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function parseJson<T>(body: string | undefined, schema: z.ZodSchema<T>): T {
  if (!body) {
    throw new ApiError(400, "bad_request", "Request body is required.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new ApiError(400, "bad_request", "Request body must be valid JSON.");
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ApiError(400, "bad_request", "Request body is invalid.");
  }
  return result.data;
}

export function getRequiredHeader(headers: Record<string, string | undefined>, name: string) {
  const lowerName = name.toLowerCase();
  const value = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName)?.[1];
  if (!value) {
    throw new ApiError(400, "bad_request", `${name} header is required.`);
  }
  return value;
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return json(error.statusCode, { error: { code: error.code, message: error.message } });
  }

  console.error("Unexpected API error", error);
  return json(500, {
    error: {
      code: "internal_error",
      message: "Something went wrong. Please try again.",
    },
  });
}
