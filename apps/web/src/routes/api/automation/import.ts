import { importAutomationTransactionSchema } from "@/features/automation/automation.dtos";
import { automationService } from "@/features/automation/automation.service";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/automation/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid JSON payload" }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            },
          );
        }

        const parsedPayload = importAutomationTransactionSchema.safeParse(payload);
        if (!parsedPayload.success) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid webhook payload" }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            },
          );
        }

        const [error, result] = await automationService.importAutomationTransaction(
          request.headers.get("authorization"),
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

          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(
          JSON.stringify({
            ok: true,
            duplicate: result.duplicate,
            transactionId: result.transactionId,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    },
  },
});
