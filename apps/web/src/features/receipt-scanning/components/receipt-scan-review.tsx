import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormFieldLabel } from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { ProductWithTag } from "@/features/products/products.models";
import { ReceiptScanLine, ReceiptScanMatchResult } from "../receipt-scanning.models";
import { receiptScanningMutations } from "../receipt-scanning.mutations";
import { CompleteReceiptCheckoutScanDTO, CompleteReceiptTransactionScanDTO } from "../receipt-scanning.dtos";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { formatAmount } from "@/utils/format";
import { format } from "date-fns";
import { AlertTriangle, FileImage, Loader2, Plus, RotateCcw, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024;
const SCAN_LOADING_STEPS = [
  "Uploading receipt...",
  "Reading text...",
  "Extracting data...",
  "Matching products...",
] as const;

type EditableScanLine = Omit<ReceiptScanLine, "product"> & {
  product: { id: string | null; name: string } | null;
};

type CheckoutTransactionOption = {
  id: string;
  store: string | null;
  description: string | null;
  date: Date;
  totalPrice: string;
  needsReview: boolean;
};

function parsePositiveNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("INVALID_FILE_RESULT"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function fromDateInputValue(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatCalculatedAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function makeBlankLine(): EditableScanLine {
  const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id,
    receiptItemName: "Manual item",
    product: null,
    suggestions: [],
    quantity: "1",
    price: "",
    lineTotal: "",
    confidence: 1,
  };
}

function getLineTotal(line: EditableScanLine) {
  const quantity = parsePositiveNumber(line.quantity) ?? 0;
  const price = parsePositiveNumber(line.price) ?? 0;
  return quantity * price;
}

function toEditableLines(result: ReceiptScanMatchResult): EditableScanLine[] {
  return result.lines.map((line) => ({
    ...line,
    product: line.product,
  }));
}

export function ReceiptScanReview({
  mode,
  products,
  fallbackHref,
  transactions = [],
  onComplete,
}: {
  mode: "transaction" | "shopping-checkout";
  products: ProductWithTag[];
  fallbackHref: string;
  transactions?: CheckoutTransactionOption[];
  onComplete: (transactionId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const online = useOnlineStatus();
  const extractMutation = receiptScanningMutations.extractReceipt();
  const transactionMutation = receiptScanningMutations.completeTransactionScan();
  const checkoutMutation = receiptScanningMutations.completeCheckoutScan();

  const [scanResult, setScanResult] = useState<ReceiptScanMatchResult | null>(null);
  const [lines, setLines] = useState<EditableScanLine[]>([]);
  const [store, setStore] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [scanLoadingStep, setScanLoadingStep] = useState(0);

  const receiptTotal = scanResult?.receipt.total ? Number(scanResult.receipt.total) : null;
  const reviewedTotal = useMemo(
    () => lines.reduce((sum, line) => sum + getLineTotal(line), 0),
    [lines],
  );
  const totalMismatch =
    receiptTotal !== null && Math.abs(receiptTotal - reviewedTotal) >= 0.01;
  const hasInvalidLines = lines.some(
    (line) => !line.product || !parsePositiveNumber(line.quantity) || !parsePositiveNumber(line.price),
  );
  const isCompleting = transactionMutation.isPending || checkoutMutation.isPending;

  useEffect(() => {
    if (!extractMutation.isPending) {
      setScanLoadingStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setScanLoadingStep((step) =>
        Math.min(step + 1, SCAN_LOADING_STEPS.length - 1),
      );
    }, 1400);

    return () => window.clearInterval(interval);
  }, [extractMutation.isPending]);

  async function handleFile(file: File) {
    setFileError(null);

    if (!online) {
      setFileError("Receipt scanning requires an internet connection.");
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isPdf) {
      setFileError("Choose an image or PDF receipt file.");
      return;
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE) {
      setFileError("Receipt file is too large. Choose an image or PDF under 10 MB.");
      return;
    }

    const imageDataUrl = await fileToDataUrl(file);
    extractMutation.mutate(
      { imageDataUrl, mode, checkedProductIds: [] },
      {
        onSuccess: (result) => {
          const [error, data] = result;
          if (error) {
            setFileError(error.message);
            return;
          }

          setScanResult(data);
          setLines(toEditableLines(data));
          setStore(data.receipt.store ?? "");
          setDate(data.parsedDate ? new Date(data.parsedDate) : new Date());
          setSubmitAttempted(false);
        },
      },
    );
  }

  function updateLine(index: number, updater: (line: EditableScanLine) => EditableScanLine) {
    setLines((prev) => prev.map((line, i) => (i === index ? updater(line) : line)));
  }

  function handleProductChange(index: number, product: ProductWithTag) {
    updateLine(index, (line) => ({
      ...line,
      product: {
        id: product.id.length === 0 ? null : product.id,
        name: product.name,
      },
      receiptItemName: line.receiptItemName === "Manual item" ? product.name : line.receiptItemName,
    }));
  }

  function handleQuantityChange(index: number, quantity: string) {
    updateLine(index, (line) => {
      const parsedQuantity = parsePositiveNumber(quantity);
      const parsedPrice = parsePositiveNumber(line.price);
      return {
        ...line,
        quantity,
        lineTotal: parsedQuantity && parsedPrice ? formatCalculatedAmount(parsedQuantity * parsedPrice) : "",
      };
    });
  }

  function handlePriceChange(index: number, price: string) {
    updateLine(index, (line) => {
      const parsedQuantity = parsePositiveNumber(line.quantity);
      const parsedPrice = parsePositiveNumber(price);
      return {
        ...line,
        price,
        lineTotal: parsedQuantity && parsedPrice ? formatCalculatedAmount(parsedQuantity * parsedPrice) : "",
      };
    });
  }

  function submit() {
    setSubmitAttempted(true);
    if (lines.length === 0 || hasInvalidLines) {
      return;
    }

    const entries = lines.map((line) => ({
      receiptItemName: line.receiptItemName,
      shoppingItemId: line.shoppingItemId,
      product: line.product!,
      quantity: line.quantity,
      price: line.price,
      type: "expense" as const,
      tagIds: [],
    }));

    if (mode === "transaction") {
      const payload: CompleteReceiptTransactionScanDTO = {
        store,
        description,
        date,
        entries,
      };
      transactionMutation.mutate(payload, {
        onSuccess: (result) => {
          const [error, transaction] = result;
          if (!error) onComplete(transaction.id);
        },
      });
      return;
    }

    const payload: CompleteReceiptCheckoutScanDTO = {
      store,
      description,
      date,
      transactionId: selectedTransactionId || undefined,
      keepUncheckedItems: true,
      entries,
    };
    checkoutMutation.mutate(payload, {
      onSuccess: (result) => {
        const [error, transaction] = result;
        if (!error) onComplete(transaction.id);
      },
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileImage className="size-4" />
            Receipt image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <LoaderButton
              type="button"
              isLoading={extractMutation.isPending}
              loadingText={
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  {SCAN_LOADING_STEPS[scanLoadingStep]}
                </span>
              }
              disabled={!online || extractMutation.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {scanResult ? "Scan another receipt" : "Upload receipt image or PDF"}
            </LoaderButton>
            {scanResult && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setScanResult(null);
                  setLines([]);
                  setFileError(null);
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
            <Button type="button" variant="ghost" asChild>
              <a href={fallbackHref}>Use manual form</a>
            </Button>
          </div>
          {!online && <p className="text-sm text-muted-foreground">Receipt scanning is unavailable while offline.</p>}
          {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          {scanResult?.receipt.warnings.length ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {scanResult.receipt.warnings.join(" ")}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Review scanned entries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField>
                <FormFieldLabel>Store</FormFieldLabel>
                <Input value={store} onChange={(event) => setStore(event.target.value)} placeholder="Store" />
              </FormField>
              <FormField>
                <FormFieldLabel>Date</FormFieldLabel>
                <Input
                  type="date"
                  value={toDateInputValue(date)}
                  onChange={(event) => setDate(fromDateInputValue(event.target.value))}
                />
              </FormField>
            </div>
            <FormField>
              <FormFieldLabel>Description</FormFieldLabel>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional note"
                className="resize-none"
              />
            </FormField>

            {mode === "shopping-checkout" && transactions.length > 0 && (
              <FormField>
                <FormFieldLabel>Link existing transaction</FormFieldLabel>
                <select
                  value={selectedTransactionId}
                  onChange={(event) => setSelectedTransactionId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="">Create a new transaction</option>
                  {transactions.map((transaction) => (
                    <option key={transaction.id} value={transaction.id}>
                      {format(new Date(transaction.date), "HH:mm")} {transaction.store || transaction.description || "Transaction"} ({formatAmount(transaction.totalPrice)})
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {totalMismatch && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Reviewed total {formatAmount(reviewedTotal)} differs from receipt total {formatAmount(receiptTotal)}. You can still complete the scan.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {lines.map((line, index) => {
                const invalid = submitAttempted && (!line.product || !parsePositiveNumber(line.quantity) || !parsePositiveNumber(line.price));
                return (
                  <div key={line.id} className={`rounded-xl border p-3 ${invalid ? "border-destructive/60" : "border-border"}`}>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{line.receiptItemName}</p>
                        {!line.product && <p className="text-xs text-destructive">Select a product or delete this line</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1fr_90px_120px_120px]">
                      <FormField>
                        <FormFieldLabel>Product</FormFieldLabel>
                        <ProductSelect
                          products={products}
                          defaultValue={line.product?.name}
                          onValueChange={(product) => handleProductChange(index, product)}
                        />
                        {!line.product && line.suggestions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {line.suggestions.map((suggestion) => (
                              <Button
                                key={suggestion.product.id}
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  updateLine(index, (current) => ({
                                    ...current,
                                    product: suggestion.product,
                                  }))
                                }
                              >
                                {suggestion.product.name}
                              </Button>
                            ))}
                          </div>
                        )}
                      </FormField>
                      <FormField>
                        <FormFieldLabel>Qty</FormFieldLabel>
                        <Input
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(event) => handleQuantityChange(index, event.target.value)}
                        />
                      </FormField>
                      <FormField>
                        <FormFieldLabel>Unit price</FormFieldLabel>
                        <Input
                          inputMode="decimal"
                          value={line.price}
                          onChange={(event) => handlePriceChange(index, event.target.value)}
                        />
                      </FormField>
                      <FormField>
                        <FormFieldLabel>Total</FormFieldLabel>
                        <Input readOnly value={formatCalculatedAmount(getLineTotal(line))} className="bg-muted/30" />
                      </FormField>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={() => setLines((prev) => [...prev, makeBlankLine()])}>
              <Plus className="size-3.5" />
              Add entry
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Reviewed total: <span className="font-medium text-foreground">{formatAmount(reviewedTotal)}</span>
            </div>
            <LoaderButton type="button" isLoading={isCompleting} disabled={isCompleting || lines.length === 0} onClick={submit}>
              Complete scan
            </LoaderButton>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
