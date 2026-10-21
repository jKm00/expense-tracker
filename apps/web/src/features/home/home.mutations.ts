import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { homeController } from "./home.controller";
import { HOME_QUERY_KEY } from "./home.queries";
import { SaveHomeConfigDTO } from "./home.dtos";
import { SHORTCUT_QUERY_KEY } from "../shortcuts/shortcuts.queries";

function saveHomeConfig() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: SaveHomeConfigDTO) => {
      assertOnline();
      return await homeController.saveHomeConfig({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [HOME_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [SHORTCUT_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to save home layout. Please try again!");
    },
  });
}

export const homeMutations = {
  saveHomeConfig,
};
