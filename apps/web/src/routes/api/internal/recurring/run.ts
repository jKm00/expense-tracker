import { recurringController } from "@/features/recurring/server/recurring.controller";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/internal/recurring/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("x-job-token") ?? "";
        const [error, result] = await recurringController.processRecurringJob({
          data: { jobToken: token },
        });

        if (error) {
          const status = error.reason === "JOB_UNAUTHORIZED" ? 401 : 500;
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: true, ...result }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
