import { importIntegrationTransactionSchema } from "@/features/integrations/integration.dtos";
import { integrationService } from "@/features/integrations/integration.service";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

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

export const Route = createFileRoute("/api/integrations/transactions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const startedAt = Date.now();
        const requestMethod = request.method;
        const requestPath = new URL(request.url).pathname;
        const userAgent = request.headers.get("user-agent");
        const ipAddress = getIpAddress(request);
        const authorizationHeader = request.headers.get("authorization");
        const requestTokenPrefix =
          integrationService.toRequestTokenPrefix(authorizationHeader);

        const [authError, authContext] =
          await integrationService.resolveBearerTokenContext(
            authorizationHeader,
          );

        if (authError) {
          const reason = authError.reason;
          switch (reason) {
            case "INTEGRATION_NO_TOKEN":
              return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
            case "INTEGRATION_DB_ERROR":
              return jsonResponse(
                { ok: false, error: "Internal server error, please try again" },
                500,
              );
            case "INTEGRATION_TOKEN_NOT_FOUND":
              return jsonResponse({ ok: false, error: "Forbidden" }, 403);
            case "INTEGRATION_TOKEN_REVOKED":
              const responseBody = { ok: false, error: "Forbidden" };
              await integrationService.logIntegrationRequest({
                userId: authError.userId,
                tokenId: authError.tokenId,
                requestTokenPrefix,
                requestMethod,
                requestPath,
                userAgent,
                ipAddress,
                responseStatus: 403,
                responseMessage: authError.message,
                responseBody: JSON.stringify(responseBody),
                errorReason: "Revoked Token",
                durationMs: Date.now() - startedAt,
              });
              return jsonResponse(responseBody, 403);
            default:
              console.log(`Unhandled reason ${reason satisfies never}`);
              return jsonResponse(
                {
                  ok: false,
                  error: "Failed to authenticate, please try again!",
                },
                500,
              );
          }
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          const responseBody = {
            ok: false,
            error: "Request body must be valid JSON.",
          };

          await integrationService.logIntegrationRequest({
            userId: authContext.userId,
            tokenId: authContext.tokenId,
            requestTokenPrefix,
            requestMethod,
            requestPath,
            userAgent,
            ipAddress,
            responseStatus: 400,
            responseMessage: "Request body must be valid JSON.",
            responseBody: JSON.stringify(responseBody),
            errorReason: "Invalid JSON payload",
            durationMs: Date.now() - startedAt,
          });

          return jsonResponse(responseBody, 400);
        }

        const rawRequestBody = JSON.stringify(payload);

        const parsedPayload =
          importIntegrationTransactionSchema.safeParse(payload);
        if (!parsedPayload.success) {
          const flattenedError = z.flattenError(parsedPayload.error);
          const responseBody = {
            ok: false,
            errors: flattenedError.fieldErrors,
            ...(flattenedError.formErrors.length > 0
              ? { formErrors: flattenedError.formErrors }
              : {}),
          };

          await integrationService.logIntegrationRequest({
            userId: authContext.userId,
            tokenId: authContext.tokenId,
            requestTokenPrefix,
            requestMethod,
            requestPath,
            requestBody: rawRequestBody,
            userAgent,
            ipAddress,
            responseStatus: 400,
            responseMessage: "Request payload failed schema validation",
            responseBody: JSON.stringify(responseBody),
            errorReason: "Invalid payload schema",
            durationMs: Date.now() - startedAt,
          });

          return jsonResponse(responseBody, 400);
        }

        const [error, result] =
          await integrationService.importIntegrationTransaction(
            authContext,
            parsedPayload.data,
          );

        if (error) {
          const reason = error.reason;
          let status: number;
          let body: Record<string, unknown>;
          let responseMessage: string;
          let userReason: string;
          switch (reason) {
            case "INTEGRATION_IMPORT_VALIDATION_ERROR":
              userReason = "Invalid date";
              status = 400;
              responseMessage = "Invalid date type";
              body = {
                ok: false,
                error: {
                  date: responseMessage,
                },
              };
              break;
            case "INTEGRATION_IMPORT_EVENT_ERROR":
              userReason = "Event error";
              status = 500;
              responseMessage = error.message;
              body = { ok: false, error: responseMessage };
              break;
            case "INTEGRATION_IMPORT_CONFLICT":
              userReason = "Conflict";
              status = 409;
              responseMessage = error.message;
              body = { ok: false, error: responseMessage };
              break;
            case "INTEGRATION_IMPORT_TRANSACTION_ERROR":
            case "INTEGRATION_PLACEHOLDER_PRODUCT_ERROR":
              userReason = "Creation error";
              status = 500;
              responseMessage = "Failed to create transaction";
              body = { ok: false, error: responseMessage };
              break;
            default:
              console.log(`Unhandled reason ${reason satisfies never}`);
              userReason = "Creation error";
              status = 500;
              responseMessage = "Failed to create transaction";
              body = { ok: false, error: responseMessage };
          }

          await integrationService.logIntegrationRequest({
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
            responseMessage: responseMessage,
            responseBody: JSON.stringify(body),
            errorReason: userReason,
            durationMs: Date.now() - startedAt,
          });

          return jsonResponse(body, status);
        }

        const responseBody = {
          ok: true,
          duplicate: result.duplicate,
          transactionId: result.transactionId,
        };

        await integrationService.logIntegrationRequest({
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
            ? "Integration event already imported"
            : "Integration import processed successfully",
          responseBody: JSON.stringify(responseBody),
          duplicate: result.duplicate,
          durationMs: Date.now() - startedAt,
        });

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
