import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shortcutController } from "./shortcuts.controller";
import { SHORTCUT_QUERY_KEY } from "./shortcuts.queries";
import {
  CreateShortcutDTO,
  DeleteShortcutDTO,
  UpdateShortcutDTO,
} from "./shortcuts.dtos";

function createShortcut() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShortcutDTO) => {
      assertOnline();
      return await shortcutController.createShortcut({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHORTCUT_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to create shortcut. Please try again!");
    },
  });
}

function updateShortcut() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateShortcutDTO) => {
      assertOnline();
      return await shortcutController.updateShortcut({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHORTCUT_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to update shortcut. Please try again!");
    },
  });
}

function deleteShortcut() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteShortcutDTO) => {
      assertOnline();
      return await shortcutController.deleteShortcut({ data });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SHORTCUT_QUERY_KEY] });
    },
    onError: () => {
      toast.error("Failed to delete shortcut. Please try again!");
    },
  });
}

export const shortcutMutations = {
  createShortcut,
  updateShortcut,
  deleteShortcut,
};
