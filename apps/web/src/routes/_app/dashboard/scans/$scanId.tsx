import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { PageHeader, PageHeaderBackButton, PageHeaderDescription, PageHeaderTitle } from "@/components/custom/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptScanReview } from "@/features/receipt-scanning/components/receipt-scan-review";
import { receiptScanningController } from "@/features/receipt-scanning/receipt-scanning.controller";
import { receiptScanningQueries } from "@/features/receipt-scanning/receipt-scanning.queries";
import { productQueries } from "@/features/products/products.queries";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, ExternalLink, FileSearch, Loader2, ReceiptText, RefreshCcw, ScanLine, UploadCloud, WandSparkles } from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";

export const Route = createFileRoute("/_app/dashboard/scans/$scanId")({ component: RouteComponent });

function ScanLoadingState() {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSearch className="size-4" />
          Opening scan
        </CardTitle>
        <CardDescription>Fetching the receipt status and review data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <ReviewSkeleton />
      </CardContent>
    </Card>
  );
}

function ScanProgressState({ status }: { status: "upload_pending" | "processing" }) {
  const waitingForUpload = status === "upload_pending";
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-primary/10 blur-3xl" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {waitingForUpload ? <UploadCloud className="size-4" /> : <WandSparkles className="size-4" />}
          {waitingForUpload ? "Waiting for the file" : "Reading the receipt"}
          <Badge variant="secondary">In progress</Badge>
        </CardTitle>
        <CardDescription>
          {waitingForUpload
            ? "The upload is being handed off to the scanner. This usually only takes a moment."
            : "Textract is finding the store, totals, and line items before we prepare the review form."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <ProgressStep done label="Upload created" icon={UploadCloud} />
          <ProgressStep active={!waitingForUpload} label="Extract details" icon={ScanLine} />
          <ProgressStep label="Review entries" icon={CheckCircle2} />
        </div>
        <div className="rounded-2xl border bg-background/60 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {waitingForUpload ? "Waiting for S3 to confirm the receipt..." : "Preparing line items for review..."}
          </div>
          <ReviewSkeleton compact />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressStep({ done, active, label, icon: Icon }: { done?: boolean; active?: boolean; label: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className={`rounded-xl border p-3 ${active ? "border-primary/40 bg-primary/5" : done ? "bg-muted/40" : "bg-background/60"}`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className={`flex size-7 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
          <Icon className="size-3.5" />
        </span>
        {label}
      </div>
    </div>
  );
}

function ReviewSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-4">
      {!compact && (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: compact ? 2 : 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_90px_120px_120px]">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanErrorState({ title, message, onRetry, onBack }: { title: string; message: string; onRetry?: () => void; onBack: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <div className="flex flex-col gap-2 sm:flex-row">
          {onRetry && <Button type="button" variant="outline" onClick={onRetry}><RefreshCcw className="size-3.5" /> Retry</Button>}
          <Button type="button" onClick={onBack}>Back to scans</Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const matchQuery = useQuery({
    ...receiptScanningQueries.matchScanOptions(scanId),
    enabled: scanQuery.data?.[1]?.status === "completed",
  });
  const { data: productsResult, error: productsUnexpectedError } = useSuspenseQuery(productQueries.getProductsOptions());
  const scan = scanQuery.data?.[1];
  const scanError = scanQuery.data?.[0];
  const [productsError, products] = productsResult;

  async function viewOriginal() {
    const [error, data] = await receiptScanningController.getScanFile({ data: { scanId } });
    if (error) return;
    if (data.contentType === "application/pdf") {
      window.open(data.url, "_blank", "noopener,noreferrer");
      return;
    }
    setImageUrl(data.url);
  }

  if (productsUnexpectedError) return <UnexpectedError />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Receipt Scan</PageHeaderTitle>
        <PageHeaderDescription>Review processing status and create a transaction when extraction completes.</PageHeaderDescription>
      </PageHeader>

      {scanQuery.isLoading ? (
        <ScanLoadingState />
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
        <ScanProgressState status={scan.status} />
      ) : productsError ? (
        <ScanErrorState
          title="Could not load products"
          message="The scan completed, but the product list needed for matching did not load. Retry before creating the transaction."
          onRetry={() => void matchQuery.refetch()}
          onBack={() => navigate({ to: "/dashboard/scans" })}
        />
      ) : matchQuery.data?.[0] ? (
        <ScanErrorState
          title="Could not prepare review"
          message={matchQuery.data[0].message}
          onRetry={() => void matchQuery.refetch()}
          onBack={() => navigate({ to: "/dashboard/scans" })}
        />
      ) : matchQuery.data?.[1] ? (
        <>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={viewOriginal}><ExternalLink className="size-3.5" /> View original</Button>
          </div>
          <ReceiptScanReview
            mode="transaction"
            products={products}
            fallbackHref="/dashboard/transactions/new"
            initialScanResult={matchQuery.data[1]}
            onComplete={(transactionId) => navigate({ to: "/dashboard/transactions/$id", params: { id: transactionId } })}
          />
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="size-4" /> Preparing review</CardTitle>
            <CardDescription>Matching receipt lines to your products.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Building the editable transaction form...</div>
            <ReviewSkeleton />
          </CardContent>
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
