import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANALYTICS_PREFERENCES_QUERY_KEY } from "@/features/analytics/analytics.queries";
import { PRODUCT_QUERY_KEY } from "@/features/products/products.queries";
import { RECURRING_QUERY_KEY } from "@/features/recurring/recurring.queries";
import { TAG_QUERY_KEY } from "@/features/tags/tags.queries";
import { TRANSACTION_QUERY_KEY } from "@/features/transactions/transactions.queries";
import { assertOnline } from "@/lib/offline-guard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Database, Download, FileJson, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { dataPortabilityController } from "./data-portability.controller";
import type {
  DataPortabilityExport,
  ExportPeriod,
  ImportSummary,
} from "./data-portability.dtos";

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDefaultFromDate() {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - 1);
  return toDateInputValue(date);
}

function getDefaultToDate() {
  return toDateInputValue(new Date());
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

function getTotal(counts: Record<string, number>) {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

function SummaryCounts({ summary }: { summary: ImportSummary }) {
  const created = getTotal(summary.creates);
  const skipped = getTotal(summary.skips);
  const conflicts = summary.conflicts.length;
  const errors = summary.errors.length;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <SummaryBadge label="Create" value={created} />
      <SummaryBadge label="Skip" value={skipped} />
      <SummaryBadge label="Conflicts" value={conflicts} />
      <SummaryBadge label="Errors" value={errors} variant={errors > 0 ? "destructive" : "secondary"} />
    </div>
  );
}

function SummaryBadge({
  label,
  value,
  variant = "secondary",
}: {
  label: string;
  value: number;
  variant?: "secondary" | "destructive";
}) {
  return (
    <div className="rounded-lg border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Badge variant={variant} className="mt-1">
        {value}
      </Badge>
    </div>
  );
}

function ReportList({ summary }: { summary: ImportSummary }) {
  const items = [...summary.errors, ...summary.conflicts];
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-medium">Review details</p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.type}-${item.id}-${index}`}>
            <span className="font-medium text-foreground">{item.type}</span> {item.name ?? item.id}: {item.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DataPortabilityCard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [periodType, setPeriodType] = useState<"all" | "range">("all");
  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [importPayload, setImportPayload] = useState<DataPortabilityExport | null>(null);
  const [previewSummary, setPreviewSummary] = useState<ImportSummary | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const exportMutation = useMutation({
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

  const previewMutation = useMutation({
    mutationFn: async (payload: DataPortabilityExport) => {
      assertOnline();
      return await dataPortabilityController.previewImport({ data: { payload } });
    },
    onSuccess: (result, payload) => {
      const [error, summary] = result as [{ message: string } | null, ImportSummary | null];
      if (error) {
        setImportError(error.message);
        setPreviewSummary(null);
        return;
      }

      if (!summary) return;

      setImportPayload(payload);
      setPreviewSummary(summary);
      setImportError(null);
    },
    onError: () => {
      setImportError("The file is not a valid expense tracker export.");
      setPreviewSummary(null);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (payload: DataPortabilityExport) => {
      assertOnline();
      return await dataPortabilityController.applyImport({ data: { payload } });
    },
    onSuccess: (result) => {
      const [error, summary] = result as [{ message: string } | null, ImportSummary | null];
      if (error) {
        toast.error(error.message);
        return;
      }

      if (!summary) return;

      setPreviewSummary(summary);
      queryClient.invalidateQueries({ queryKey: [TRANSACTION_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PRODUCT_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TAG_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [RECURRING_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [ANALYTICS_PREFERENCES_QUERY_KEY] });
      toast.success("Import complete");
    },
    onError: () => {
      toast.error("Failed to import your data. Please try again.");
    },
  });

  const period: ExportPeriod =
    periodType === "all"
      ? { type: "all" }
      : { type: "range", from: fromDate, to: toDate };

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImportPayload(null);
    setPreviewSummary(null);
    setImportError(null);

    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      setImportError("Import file is larger than 10 MB. Export a smaller period or use a smaller file.");
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as DataPortabilityExport;
      previewMutation.mutate(parsed);
    } catch {
      setImportError("The selected file is not valid JSON.");
    }
  }

  const canExport = period.type === "all" || fromDate <= toDate;
  const canApply = Boolean(importPayload && previewSummary && previewSummary.errors.length === 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-lg bg-muted">
            <Database className="size-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>Data portability</CardTitle>
            <CardDescription>Export or import your expense tracker data as JSON</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Download className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Export data</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="export-period">Period</Label>
              <select
                id="export-period"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={periodType}
                onChange={(event) => setPeriodType(event.target.value as "all" | "range")}
              >
                <option value="all">All time</option>
                <option value="range">Date range</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-from">From</Label>
              <Input
                id="export-from"
                type="date"
                value={fromDate}
                disabled={periodType === "all"}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-to">To</Label>
              <Input
                id="export-to"
                type="date"
                value={toDate}
                disabled={periodType === "all"}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={!canExport || exportMutation.isPending}
              onClick={() => exportMutation.mutate(period)}
            >
              <FileJson className="size-4" />
              {exportMutation.isPending ? "Exporting..." : "Download JSON"}
            </Button>
          </div>
          {!canExport && (
            <p className="text-sm text-destructive">From date must be before or equal to to date.</p>
          )}
        </section>

        <section className="space-y-3 border-t pt-6">
          <div className="flex items-center gap-2">
            <Upload className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Import data</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="import-file">JSON export file</Label>
            <Input
              ref={fileInputRef}
              id="import-file"
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Upload an expense tracker JSON export up to 10 MB. The app previews changes before writing anything.
            </p>
          </div>

          {previewMutation.isPending && (
            <Alert>
              <FileJson className="size-4" />
              <AlertTitle>Validating import</AlertTitle>
              <AlertDescription>Checking the file and calculating what will be created or skipped.</AlertDescription>
            </Alert>
          )}

          {importError && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Import cannot be previewed</AlertTitle>
              <AlertDescription>{importError}</AlertDescription>
            </Alert>
          )}

          {previewSummary && (
            <div className="space-y-3">
              <SummaryCounts summary={previewSummary} />
              <ReportList summary={previewSummary} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  disabled={!canApply || applyMutation.isPending}
                  onClick={() => importPayload && applyMutation.mutate(importPayload)}
                >
                  <Upload className="size-4" />
                  {applyMutation.isPending ? "Importing..." : "Confirm import"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setImportPayload(null);
                    setPreviewSummary(null);
                    setImportError(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Clear file
                </Button>
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
