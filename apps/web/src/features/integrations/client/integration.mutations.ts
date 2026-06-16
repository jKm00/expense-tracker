import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateIntegrationTokenDTO,
  RevokeIntegrationTokenDTO,
} from "@/features/integrations/shared/integration.dtos";
import { integrationController } from "@/features/integrations/server/integration.controller";
import { INTEGRATION_QUERY_KEY } from "./integration.queries";
import { toast } from "sonner";

function createIntegrationToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateIntegrationTokenDTO) => {
      assertOnline();
      return await integrationController.createIntegrationToken({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INTEGRATION_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to create integration token. Please try again!");
    },
  });
}

function revokeIntegrationToken() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: RevokeIntegrationTokenDTO) => {
      assertOnline();
      return await integrationController.revokeIntegrationToken({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INTEGRATION_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to revoke integration token. Please try again!");
    },
  });
}

export const integrationMutations = {
  createIntegrationToken,
  revokeIntegrationToken,
};
