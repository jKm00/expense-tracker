import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { PageHeader, PageHeaderBackButton, PageHeaderDescription, PageHeaderTitle } from "@/components/custom/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScanBetaBadge, ScanErrorState } from "@/features/receipt-scanning/components/scan-states";
import { receiptScanningController } from "@/features/receipt-scanning/receipt-scanning.controller";
import { receiptScanningQueries } from "@/features/receipt-scanning/receipt-scanning.queries";
import { formatAmount } from "@/utils/format";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, FileImage, Loader2, ReceiptText } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app/dashboard/scans/$scanId")({ component: RouteComponent });

function RouteComponent() {
  const { scanId } = Route.useParams();
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const scanQuery = useQuery({
    ...receiptScanningQueries.getScanOptions(scanId),
    refetchInterval: (query) => {
      const data = query.state.data?.[1];
      return data?.status === "upload_pending" || data?.status === "processing" ? 2000 : false;
    },
  });
  const scan = scanQuery.data?.[1];
  const scanError = scanQuery.data?.[0];

  async function viewOriginal() {
    const [error, data] = await receiptScanningController.getScanFile({ data: { scanId } });
    if (error) return;
    if (data.contentType === "application/pdf") {
      window.open(data.url, "_blank", "noopener,noreferrer");
      return;
    }
    setImageUrl(data.url);
  }

  if (scanQuery.error) return <UnexpectedError />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle><span className="inline-flex items-center gap-2">Receipt Scan <ScanBetaBadge /></span></PageHeaderTitle>
        <PageHeaderDescription>Review processing status and create a transaction when extraction completes.</PageHeaderDescription>
      </PageHeader>

      {scanQuery.isLoading ? (
        <ScanHistoryLoadingState />
      ) : scanError || !scan ? (
        <ScanErrorState
          title={scanError ? "Could not load this scan" : "Scan not found"}
          message={scanError?.message ?? "The scan may have been deleted or belongs to another user."}
          onRetry={() => void scanQuery.refetch()}
          onBack={() => navigate({ to: "/dashboard/scans" })}
        />
      ) : scan.status === "failed" ? (
        <ScanErrorState
          title="Scan failed"
          message={scan.failureMessage ?? "The receipt could not be processed. Try a clearer photo or upload the receipt as a PDF."}
          onBack={() => navigate({ to: "/dashboard/scans" })}
        />
      ) : scan.status !== "completed" ? (
        <ScanHistoryPendingState status={scan.status} onRefresh={() => void scanQuery.refetch()} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="size-4" /> Completed scan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Store</p>
                <p className="truncate text-sm font-medium">{scan.resultSummary?.store || "Unknown"}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
                <p className="text-sm font-medium">{scan.resultSummary?.itemCount ?? 0}</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-sm font-medium">{scan.resultSummary?.total ? formatAmount(scan.resultSummary.total) : "Unknown"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{scan.mode === "shopping-checkout" ? "Shopping checkout" : scan.mode === "transaction-replacement" ? "Replace transaction" : "New transaction"}</Badge>
              <Badge variant="outline">{new Date(scan.createdAt).toLocaleString()}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Scan history is a utility view. Continue from here to review this receipt as a new transaction.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={viewOriginal}><ExternalLink className="size-3.5" /> View original</Button>
            <Button asChild>
              <Link to="/dashboard/transactions/new" search={{ method: "scan", scanId }}>
                <FileImage className="size-3.5" /> Continue as new transaction
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={Boolean(imageUrl)} onOpenChange={(open) => !open && setImageUrl(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Original receipt</DialogTitle></DialogHeader>
          {imageUrl && <img src={imageUrl} alt="Original receipt" className="max-h-[75vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScanHistoryLoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptText className="size-4" /> Loading scan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

function ScanHistoryPendingState({ status, onRefresh }: { status: "upload_pending" | "processing"; onRefresh: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="size-4 animate-spin" /> Scan still processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="secondary">{status === "upload_pending" ? "Upload pending" : "Processing"}</Badge>
        <p className="text-sm text-muted-foreground">
          This scan has not finished yet. History usually opens after processing is complete, but you can refresh if you arrived early.
        </p>
        <Button type="button" variant="outline" onClick={onRefresh}>Refresh status</Button>
      </CardContent>
    </Card>
  );
}
