import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { analyticsController } from "./analytics.controller";
import { UpdateAnalyticsExclusionsDTO } from "./analytics.dtos";
import { ANALYTICS_PREFERENCES_QUERY_KEY } from "./analytics.queries";

function updateExclusions() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateAnalyticsExclusionsDTO) => {
      assertOnline();
      return await analyticsController.updateExclusions({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ANALYTICS_PREFERENCES_QUERY_KEY] });
    },
    onError: () => {
      toast.error(
        "Something unexpected happened when saving chart configuration. Please try again!",
      );
    },
  });
}

export const analyticsMutations = {
  updateExclusions,
};
