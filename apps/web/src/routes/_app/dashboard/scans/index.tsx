import { EmptyState, EmptyStateAction, EmptyStateMessage } from "@/components/custom/empty-state";
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from "@/components/custom/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LoaderButton } from "@/components/custom/loader.button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { receiptScanningController } from "@/features/receipt-scanning/receipt-scanning.controller";
import { receiptScanningMutations } from "@/features/receipt-scanning/receipt-scanning.mutations";
import { AwsScanSummary } from "@/features/receipt-scanning/receipt-scanning.models";
import { validateReceiptFile } from "@/features/receipt-scanning/receipt-scanning.utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Clock3, FileImage, History, Loader2, ReceiptText, RefreshCcw, Sparkles, Trash2, Upload, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_app/dashboard/scans/")({ component: RouteComponent });

function statusLabel(status: AwsScanSummary["status"]) {
  if (status === "upload_pending") return "Upload pending";
  if (status === "processing") return "Processing";
  if (status === "completed") return "Completed";
  return "Failed";
}

function statusBadgeVariant(status: AwsScanSummary["status"]) {
  if (status === "failed") return "destructive" as const;
  if (status === "completed") return "default" as const;
  return "secondary" as const;
}

function ScanHistorySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyUsageIndicator({ usage, loading }: { usage?: { used: number; limit: number; remaining: number; resetsAt: string }; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-background/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="rounded-xl border bg-background/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Daily scan limit</p>
            <p className="text-xs text-muted-foreground">Usage will appear after the scan API is redeployed.</p>
          </div>
          <Badge variant="outline">5/day</Badge>
        </div>
      </div>
    );
  }

  const percent = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const exhausted = usage.remaining <= 0;
  const almostFull = !exhausted && usage.remaining === 1;
  const resetTime = new Date(usage.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`rounded-xl border p-3 ${exhausted ? "border-destructive/30 bg-destructive/5" : almostFull ? "border-amber-500/30 bg-amber-500/10" : "bg-background/60"}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Daily scan limit</p>
          <p className="text-xs text-muted-foreground">
            {exhausted ? "Limit reached" : `${usage.remaining} ${usage.remaining === 1 ? "scan" : "scans"} left today`} · resets at {resetTime}
          </p>
        </div>
        <Badge variant={exhausted ? "destructive" : almostFull ? "secondary" : "outline"}>{usage.used}/{usage.limit}</Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${exhausted ? "bg-destructive" : almostFull ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function RouteComponent() {
  const inputRef = useRef<HTMLInputElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const createUpload = receiptScanningMutations.createScanUpload();
  const deleteScan = receiptScanningMutations.deleteScan();
  const [fileError, setFileError] = useState<string | null>(null);
  const scansQuery = useInfiniteQuery({
    queryKey: ["receipt-scanning", "history"],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const [error, data] = await receiptScanningController.listScans({ data: { cursor: pageParam, limit: 20 } });
      if (error) throw new Error(error.message);
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && scansQuery.hasNextPage && !scansQuery.isFetchingNextPage) {
        void scansQuery.fetchNextPage();
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scansQuery]);

  async function handleFile(file: File) {
    setFileError(null);
    if (usage && usage.remaining <= 0) {
      setFileError("Daily scan limit reached. Try again after the limit resets.");
      return;
    }
    const validationError = validateReceiptFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    createUpload.mutate(
      { fileName: file.name, contentType: file.type as "image/jpeg" | "image/png" | "application/pdf", sizeBytes: file.size, mode: "transaction" },
      {
        onSuccess: async ([error, data]) => {
          if (error) {
            setFileError(error.message);
            return;
          }
          const upload = await fetch(data.uploadUrl, { method: "PUT", headers: data.uploadHeaders, body: file });
          if (!upload.ok) {
            setFileError("Upload failed. Please try again.");
            return;
          }
          navigate({ to: "/dashboard/scans/$scanId", params: { scanId: data.scanId } });
        },
      },
    );
  }

  function handleDelete(scanId: string) {
    deleteScan.mutate(scanId, {
      onSuccess: ([error]) => {
        if (error) {
          setFileError(error.message);
          return;
        }
        void scansQuery.refetch();
      },
      onError: () => setFileError("Could not delete scan. Please try again."),
    });
  }

  const scans = scansQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const usage = scansQuery.data?.pages[0]?.usage;
  const dailyLimitReached = Boolean(usage && usage.remaining <= 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderTitle>Receipt Scans</PageHeaderTitle>
        <PageHeaderDescription>Upload receipt files, track processing, and turn completed scans into transactions.</PageHeaderDescription>
      </PageHeader>

      <Card className="relative overflow-hidden border-foreground/10 bg-gradient-to-br from-card via-card to-muted/50">
        <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><UploadCloud className="size-4" /> New scan</CardTitle>
          <CardDescription>Send the receipt to Textract, then review every extracted line before it becomes a transaction.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.currentTarget.value = "";
          }} />
          <div className="rounded-2xl border border-dashed bg-background/60 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ReceiptText className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium">JPEG, PNG, or PDF under 10 MB</p>
                  <p className="text-sm text-muted-foreground">Best results come from flat, well-lit receipts with all totals visible.</p>
                </div>
              </div>
              <LoaderButton type="button" isLoading={createUpload.isPending} disabled={dailyLimitReached} onClick={() => inputRef.current?.click()}>
                <Upload className="size-3.5" /> {dailyLimitReached ? "Limit reached" : "Choose receipt"}
              </LoaderButton>
            </div>
          </div>
          <DailyUsageIndicator usage={usage} loading={scansQuery.isLoading} />
          {fileError && <p className="text-sm text-destructive">{fileError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="grid-cols-[1fr_auto]">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><History className="size-4" /> Previous scans</CardTitle>
          <CardDescription>Processing receipts stay here until they are ready to review.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scansQuery.isRefetching}
            onClick={() => void scansQuery.refetch()}
          >
            <RefreshCcw className={`size-3.5 ${scansQuery.isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {scansQuery.isLoading ? (
            <ScanHistorySkeleton />
          ) : scans.length === 0 ? (
            <EmptyState icon={FileImage}>
              <EmptyStateMessage>No receipt scans yet. Upload your first receipt and this list will become your processing queue.</EmptyStateMessage>
              <EmptyStateAction><Button disabled={dailyLimitReached} onClick={() => inputRef.current?.click()}>{dailyLimitReached ? "Limit reached" : "Upload receipt"}</Button></EmptyStateAction>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {scans.map((scan) => (
                <div key={scan.scanId} className="flex items-start gap-2 rounded-xl border p-2 transition-colors hover:border-primary/40 hover:bg-muted/40">
                  <Link to="/dashboard/scans/$scanId" params={{ scanId: scan.scanId }} className="min-w-0 flex-1 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          {scan.status === "completed" ? <CheckCircle2 className="size-4" /> : scan.status === "processing" ? <Sparkles className="size-4" /> : <Clock3 className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{scan.resultSummary?.store || scan.fileName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(scan.createdAt).toLocaleString()} · {scan.resultSummary?.itemCount ?? 0} items</p>
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant(scan.status)}>{statusLabel(scan.status)}</Badge>
                    </div>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={deleteScan.isPending && deleteScan.variables === scan.scanId ? `Deleting scan ${scan.fileName}` : `Delete scan ${scan.fileName}`}
                        disabled={deleteScan.isPending}
                      >
                        {deleteScan.isPending && deleteScan.variables === scan.scanId ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive">
                          <AlertTriangle className="size-5" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Delete this scan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the uploaded receipt and extracted scan result. Any transaction you already created from it will stay untouched.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep scan</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => handleDelete(scan.scanId)}>
                          Delete scan
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              <div ref={sentinelRef} className="h-8" />
              {scansQuery.isFetchingNextPage && <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading more scans</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
