import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import { PageHeader, PageHeaderBackButton, PageHeaderDescription, PageHeaderTitle } from "@/components/custom/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReceiptScanReview } from "@/features/receipt-scanning/components/receipt-scan-review";
import { ScanBetaBadge, ScanErrorState, ScanLoadingState, ScanPreparingReviewState, ScanProgressState } from "@/features/receipt-scanning/components/scan-states";
import { receiptScanningController } from "@/features/receipt-scanning/receipt-scanning.controller";
import { receiptScanningQueries } from "@/features/receipt-scanning/receipt-scanning.queries";
import { productQueries } from "@/features/products/products.queries";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
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
        <PageHeaderTitle><span className="inline-flex items-center gap-2">Receipt Scan <ScanBetaBadge /></span></PageHeaderTitle>
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
        <ScanPreparingReviewState />
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
