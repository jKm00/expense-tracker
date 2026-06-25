import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderBackButton,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { LoaderButton } from "@/components/custom/loader.button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { productQueries } from "@/features/products/products.queries";
import { setPendingTransactionScan } from "@/features/receipt-scanning/receipt-scan-session";
import { receiptScanningMutations } from "@/features/receipt-scanning/receipt-scanning.mutations";
import { fileToDataUrl, validateReceiptFile } from "@/features/receipt-scanning/receipt-scanning.utils";
import { tagsQueries } from "@/features/tags/tags.queries";
import { EditTransactionForm } from "@/features/transactions/components/edit-transaction.form";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileImage, Loader2, Upload } from "lucide-react";
import { Suspense, useRef, useState } from "react";

export const Route = createFileRoute("/_app/dashboard/transactions/$id/edit")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        productQueries.getProductsOptions(),
      ),
      context.queryClient.ensureQueryData(tagsQueries.getTagsOptions()),
      context.queryClient.ensureQueryData(
        transactionQueries.getTransactionOptions(params.id),
      ),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderBackButton />
        <PageHeaderTitle>Edit Transaction</PageHeaderTitle>
        <PageHeaderDescription>
          Modify transaction details
        </PageHeaderDescription>
        <PageHeaderActions>
          <ScanReceiptAction transactionId={id} />
        </PageHeaderActions>
      </PageHeader>
      <Suspense>
        <EditTransactionFormWrapper />
      </Suspense>
    </div>
  );
}

function ScanReceiptAction({ transactionId }: { transactionId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const extractMutation = receiptScanningMutations.extractReceipt();
  const [open, setOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const {
    data: [expectedTransactionError, transaction],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionOptions(transactionId));

  if (unexpectedTransactionError || expectedTransactionError) {
    return null;
  }

  const canScan =
    transaction.source !== "recurring" &&
    transaction.entries.every((entry) => entry.type === "expense");

  if (!canScan) {
    return null;
  }

  async function handleFile(file: File) {
    setFileError(null);

    if (!online) {
      setFileError("Receipt scanning requires an internet connection.");
      return;
    }

    const validationError = validateReceiptFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    try {
      const imageDataUrl = await fileToDataUrl(file);
      extractMutation.mutate(
        { imageDataUrl, mode: "transaction", checkedProductIds: [] },
        {
          onSuccess: (result) => {
            const [error, data] = result;
            if (error) {
              setFileError(error.message);
              return;
            }

            setPendingTransactionScan(transactionId, data);
            setOpen(false);
            navigate({
              to: "/dashboard/transactions/$id/scan",
              params: { id: transactionId },
            });
          },
        },
      );
    } catch {
      setFileError("Could not read the receipt file. Please try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Scan receipt">
          <FileImage className="size-4" />
          <span className="max-md:sr-only">Scan receipt</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan Receipt</DialogTitle>
          <DialogDescription>
            Upload an image or PDF receipt. After analysis, you will review the extracted entries before replacing this transaction.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.currentTarget.value = "";
          }}
        />
        <LoaderButton
          type="button"
          isLoading={extractMutation.isPending}
          loadingText={
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" />
              Analyzing receipt...
            </span>
          }
          disabled={!online || extractMutation.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          Upload receipt image or PDF
        </LoaderButton>
        {!online && <p className="text-sm text-muted-foreground">Receipt scanning is unavailable while offline.</p>}
        {fileError && <p className="text-sm text-destructive">{fileError}</p>}
      </DialogContent>
    </Dialog>
  );
}

function EditTransactionFormWrapper() {
  const { id } = Route.useParams();

  const {
    data: [expectedProductError, products],
    error: unexpectedProductError,
  } = useSuspenseQuery(productQueries.getProductsOptions());
  const {
    data: [expectedTagsError, tags],
    error: unexpectedTagsError,
  } = useSuspenseQuery(tagsQueries.getTagsOptions());

  const {
    data: [expectedTransactionError, transaction],
    error: unexpectedTransactionError,
  } = useSuspenseQuery(transactionQueries.getTransactionOptions(id));

  if (unexpectedProductError || unexpectedTagsError || unexpectedTransactionError) {
    return <UnexpectedError />;
  }

  if (expectedProductError) {
    let title: string;
    let message: string;

    const reason = expectedProductError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your products from the database. Please try again";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  if (expectedTransactionError) {
    let title: string;
    let message: string;

    const reason = expectedTransactionError.reason;
    switch (reason) {
      case "TRANSACTION_NOT_FOUND":
        title = "Transaction not found";
        message = "The transaction you are trying to edit does not exist.";
        break;
      case "TRANSACTION_UNAUTHORIZED":
        title = "Unauthorized";
        message = "You do not have permission to edit this transaction.";
        break;
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch the transaction from the database. Please try again";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  if (expectedTagsError) {
    let title: string;
    let message: string;

    const reason = expectedTagsError.reason;
    switch (reason) {
      case "UNEXPECTED_DB_ERROR":
        title = "Database error";
        message =
          "Something went wrong trying to fetch your tags from the database. Please try again";
        break;
      default:
        title = "Unexpected error";
        message = `Something unexpected happened: ${reason satisfies never}. Please try again!`;
        break;
    }

    return (
      <ExpectedError>
        <ExpectedErrorTitle>{title}</ExpectedErrorTitle>
        <ExpectedErrorMessage>{message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <EditTransactionForm
      products={products}
      tags={tags || []}
      transaction={transaction}
    />
  );
}
