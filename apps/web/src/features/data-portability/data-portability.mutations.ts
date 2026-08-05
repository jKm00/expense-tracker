import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ANALYTICS_PREFERENCES_QUERY_KEY } from "@/features/analytics/analytics.queries";
import { PRODUCT_QUERY_KEY } from "@/features/products/products.queries";
import { RECURRING_QUERY_KEY } from "@/features/recurring/recurring.queries";
import { TAG_QUERY_KEY } from "@/features/tags/tags.queries";
import { TRANSACTION_QUERY_KEY } from "@/features/transactions/transactions.queries";
import { assertOnline } from "@/lib/offline-guard";
import { toast } from "sonner";
import { dataPortabilityController } from "./data-portability.controller";
import type {
  DataPortabilityExport,
  ExportPeriod,
  ImportSummary,
} from "./data-portability.dtos";

function getDefaultToDate() {
  return new Date().toISOString().slice(0, 10);
}

function buildFilename(period: ExportPeriod) {
  if (period.type === "all") {
    return `expense-tracker-export-all-${getDefaultToDate()}.json`;
  }

  return `expense-tracker-export-${period.from.slice(0, 10)}_to_${period.to.slice(0, 10)}.json`;
}

function downloadJson(payload: DataPortabilityExport, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function useExportData() {
  return useMutation({
    mutationFn: async (period: ExportPeriod) => {
      assertOnline();
      return await dataPortabilityController.exportData({ data: period });
    },
    onSuccess: (result, period) => {
      const [error, payload] = result as [
        { message: string } | null,
        DataPortabilityExport | null,
      ];
      if (error) {
        toast.error(error.message);
        return;
      }

      if (!payload) return;

      downloadJson(payload, buildFilename(period));
      toast.success("Export downloaded");
    },
    onError: () => {
      toast.error("Failed to export your data. Please try again.");
    },
  });
}

function usePreviewImport() {
  return useMutation({
    mutationFn: async (payload: DataPortabilityExport) => {
      assertOnline();
      return await dataPortabilityController.previewImport({
        data: { payload },
      });
    },
  });
}

function useApplyImport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DataPortabilityExport) => {
      assertOnline();
      return await dataPortabilityController.applyImport({ data: { payload } });
    },
    onSuccess: (result) => {
      const [error] = result as [
        { message: string } | null,
        ImportSummary | null,
      ];
      if (error) {
        toast.error(error.message);
        return;
      }

      qc.invalidateQueries({ queryKey: [TRANSACTION_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [PRODUCT_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [TAG_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: [ANALYTICS_PREFERENCES_QUERY_KEY] });
      toast.success("Import complete");
    },
    onError: () => {
      toast.error("Failed to import your data. Please try again.");
    },
  });
}

export const dataPortabilityMutations = {
  useExportData,
  usePreviewImport,
  useApplyImport,
};
