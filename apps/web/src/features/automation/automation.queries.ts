import { queryOptions } from "@tanstack/react-query";
import { automationController } from "./automation.controller";

export const AUTOMATION_QUERY_KEY = "automation";

function getAutomationTokensOptions() {
  return queryOptions({
    queryKey: [AUTOMATION_QUERY_KEY, "tokens"],
    queryFn: automationController.listAutomationTokens,
  });
}

export const automationQueries = {
  getAutomationTokensOptions,
};
