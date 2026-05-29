import { importAutomationTransactionSchema } from "@/features/automation/automation.dtos";
import { automationService } from "@/features/automation/automation.service";
import { createFileRoute } from "@tanstack/react-router";

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip");
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/automation/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const authorizationHeader = request.headers.get("authorization");
        const requestTokenPrefix = automationService.toRequestTokenPrefix(
          authorizationHeader,
        );
        const [authError, authContext] =
          await automationService.resolveBearerTokenContext(authorizationHeader, {
            touchLastUsed: false,
          });
        const requestMethod = request.method;
        const requestPath = new URL(request.url).pathname;
        const userAgent = request.headers.get("user-agent");
        const ipAddress = getIpAddress(request);

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          if (!authError) {
            await automationService.logAutomationRequest({
              userId: authContext.userId,
              tokenId: authContext.tokenId,
              requestTokenPrefix,
              requestMethod,
              requestPath,
              userAgent,
              ipAddress,
              responseStatus: 400,
              responseMessage: "Invalid JSON payload",
              responseBody: JSON.stringify({ ok: false, error: "Invalid JSON payload" }),
              errorReason: "AUTOMATION_IMPORT_INVALID_JSON",
              durationMs: Date.now() - startedAt,
            });
          }

          return jsonResponse(
            { ok: false, error: "Invalid JSON payload" },
            400,
          );
        }

        const rawRequestBody = JSON.stringify(payload);

        const parsedPayload = importAutomationTransactionSchema.safeParse(payload);
        if (!parsedPayload.success) {
          if (!authError) {
            await automationService.logAutomationRequest({
              userId: authContext.userId,
              tokenId: authContext.tokenId,
              requestTokenPrefix,
              requestMethod,
              requestPath,
              requestBody: rawRequestBody,
              userAgent,
              ipAddress,
              responseStatus: 400,
              responseMessage: "Invalid webhook payload",
              responseBody: JSON.stringify({ ok: false, error: "Invalid webhook payload" }),
              errorReason: "AUTOMATION_IMPORT_VALIDATION_ERROR",
              durationMs: Date.now() - startedAt,
            });
          }

          return jsonResponse({ ok: false, error: "Invalid webhook payload" }, 400);
        }

        const [error, result] = await automationService.importAutomationTransaction(
          authorizationHeader,
          parsedPayload.data,
        );

        if (error) {
          const status =
            error.reason === "AUTOMATION_UNAUTHORIZED"
              ? 401
              : error.reason === "AUTOMATION_IMPORT_CONFLICT"
                ? 409
                : error.reason === "AUTOMATION_IMPORT_VALIDATION_ERROR"
                  ? 400
                  : 500;

          if (!authError) {
            await automationService.logAutomationRequest({
              userId: authContext.userId,
              tokenId: authContext.tokenId,
              requestTokenPrefix,
              requestMethod,
              requestPath,
              provider: parsedPayload.data.provider,
              eventId: parsedPayload.data.eventId,
              requestBody: rawRequestBody,
              userAgent,
              ipAddress,
              responseStatus: status,
              responseMessage: error.message,
              responseBody: JSON.stringify({ ok: false, error: error.message }),
              errorReason: error.reason,
              durationMs: Date.now() - startedAt,
            });
          }

          return jsonResponse({ ok: false, error: error.message }, status);
        }

        const responseBody = {
          ok: true,
          duplicate: result.duplicate,
          transactionId: result.transactionId,
        };

        if (!authError) {
          await automationService.logAutomationRequest({
            userId: authContext.userId,
            tokenId: authContext.tokenId,
            transactionId: result.transactionId,
            requestTokenPrefix,
            requestMethod,
            requestPath,
            provider: parsedPayload.data.provider,
            eventId: parsedPayload.data.eventId,
            requestBody: rawRequestBody,
            userAgent,
            ipAddress,
            responseStatus: 200,
            responseMessage: result.duplicate
              ? "Automation event already imported"
              : "Automation import processed successfully",
            responseBody: JSON.stringify(responseBody),
            duplicate: result.duplicate,
            durationMs: Date.now() - startedAt,
          });
        }

        return jsonResponse(
          {
            ok: true,
            duplicate: result.duplicate,
            transactionId: result.transactionId,
          },
          200,
        );
      },
    },
  },
});
