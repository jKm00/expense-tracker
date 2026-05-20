import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateAutomationTokenDTO,
  RevokeAutomationTokenDTO,
} from "./automation.dtos";
import { automationController } from "./automation.controller";
import { AUTOMATION_QUERY_KEY } from "./automation.queries";
import { toast } from "sonner";

function createAutomationToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAutomationTokenDTO) => {
      assertOnline();
      return await automationController.createAutomationToken({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AUTOMATION_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to create automation token. Please try again!");
    },
  });
}

function revokeAutomationToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: RevokeAutomationTokenDTO) => {
      assertOnline();
      return await automationController.revokeAutomationToken({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [AUTOMATION_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to revoke automation token. Please try again!");
    },
  });
}

export const automationMutations = {
  createAutomationToken,
  revokeAutomationToken,
};
