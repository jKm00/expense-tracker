import { ProductSelect } from "@/components/custom/product-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormFieldLabel } from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { ProductWithTag } from "@/features/products/products.models";
import { integrationQueries } from "@/features/integrations/integration.queries";
import { IntegrationTokenMetadata } from "@/features/integrations/integration.models";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { getCheckoutLinkSuggestion, getSelectableCheckoutTransactions, hasActiveIntegrationTokens } from "@/features/shopping/components/shopping-checkout.utils";
import { ReceiptScanLine, ReceiptScanMatchResult } from "../receipt-scanning.models";
import { receiptScanningMutations } from "../receipt-scanning.mutations";
import {
  CompleteReceiptCheckoutScanDTO,
  CompleteReceiptTransactionReplacementScanDTO,
  CompleteReceiptTransactionScanDTO,
} from "../receipt-scanning.dtos";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { formatAmount } from "@/utils/format";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { AlertTriangle, Check, FileImage, Link2, Loader2, Plus, RotateCcw, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { validateReceiptFile } from "../receipt-scanning.utils";
import { receiptScanningQueries } from "../receipt-scanning.queries";
import { DailyUsageIndicator, ScanPreparingReviewState, ScanProgressState } from "./scan-states";

type EditableScanLine = Omit<ReceiptScanLine, "product"> & {
  product: { id: string | null; name: string } | null;
};

type ReceiptScanTargetTransaction = {
  id: string;
  store: string | null;
  description: string | null;
  date: Date;
  totalPrice: string;
};

function parsePositiveNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

function getActiveTokens(data: [unknown, IntegrationTokenMetadata[]] | undefined) {
  if (!data || data[0] || !data[1]) return [];
  return data[1];
}

function getTransactions(data: [unknown, FullTransaction[]] | undefined) {
  if (!data || data[0] || !data[1]) return [];
  return data[1];
}

function dedupeTransactions(transactions: FullTransaction[]) {
  return Array.from(new Map(transactions.map((transaction) => [transaction.id, transaction])).values());
}

function formatTransactionOption(transaction: FullTransaction) {
  const title = transaction.store || transaction.description || "Transaction";
  return `${format(transaction.date, "HH:mm")} ${title} · ${formatAmount(transaction.totalPrice)}`;
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
  initialScanResult,
  targetTransaction,
  onComplete,
}: {
  mode: "transaction" | "shopping-checkout";
  products: ProductWithTag[];
  fallbackHref: string;
  initialScanResult?: ReceiptScanMatchResult | null;
  targetTransaction?: ReceiptScanTargetTransaction;
  onComplete: (transactionId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const initialScanAppliedRef = useRef(false);
  const online = useOnlineStatus();
  const uploadMutation = receiptScanningMutations.createScanUpload();
  const transactionMutation = receiptScanningMutations.completeTransactionScan();
  const transactionReplacementMutation =
    receiptScanningMutations.completeTransactionReplacementScan();
  const checkoutMutation = receiptScanningMutations.completeCheckoutScan();
  const isReplacingTransaction = mode === "transaction" && Boolean(targetTransaction);

  const [scanResult, setScanResult] = useState<ReceiptScanMatchResult | null>(null);
  const [lines, setLines] = useState<EditableScanLine[]>([]);
  const [store, setStore] = useState(targetTransaction?.store ?? "");
  const [description, setDescription] = useState(targetTransaction?.description ?? "");
  const [date, setDate] = useState(targetTransaction ? new Date(targetTransaction.date) : new Date());
  const [fileError, setFileError] = useState<string | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const scanQuery = useQuery({
    ...receiptScanningQueries.getScanOptions(activeScanId ?? ""),
    enabled: Boolean(activeScanId),
    refetchInterval: (query) => {
      const data = query.state.data?.[1];
      return data?.status === "upload_pending" || data?.status === "processing" ? 2000 : false;
    },
  });
  const matchQuery = useQuery({
    ...receiptScanningQueries.matchScanOptions(activeScanId ?? ""),
    enabled: scanQuery.data?.[1]?.status === "completed",
  });
  const usageQuery = useQuery(receiptScanningQueries.listScansOptions());
  const previousDay = subDays(date, 1);
  const previousDayUsesDifferentMonth =
    previousDay.getFullYear() !== date.getFullYear() ||
    previousDay.getMonth() !== date.getMonth();
  const integrationTokenQuery = useQuery({
    ...integrationQueries.getIntegrationTokensOptions(),
    enabled: mode === "shopping-checkout",
  });
  const checkoutTransactionQuery = useQuery({
    ...transactionQueries.getTransactionsOptions(date.getFullYear(), date.getMonth()),
    enabled: mode === "shopping-checkout",
  });
  const previousMonthCheckoutTransactionQuery = useQuery({
    ...transactionQueries.getTransactionsOptions(previousDay.getFullYear(), previousDay.getMonth()),
    enabled: mode === "shopping-checkout" && previousDayUsesDifferentMonth,
  });

  const receiptTotal = scanResult?.receipt.total ? Number(scanResult.receipt.total) : null;
  const reviewedTotal = useMemo(
    () => lines.reduce((sum, line) => sum + getLineTotal(line), 0),
    [lines],
  );
  const totalMismatch =
    receiptTotal !== null && Math.abs(receiptTotal - reviewedTotal) >= 0.01;
  const originalTotalMismatch =
    targetTransaction && Math.abs(Math.abs(Number(targetTransaction.totalPrice)) - reviewedTotal) >= 0.01;
  const hasInvalidLines = lines.some(
    (line) => !line.product || !parsePositiveNumber(line.quantity) || !parsePositiveNumber(line.price),
  );
  const isCompleting =
    transactionMutation.isPending ||
    transactionReplacementMutation.isPending ||
    checkoutMutation.isPending;
  const activeScan = scanQuery.data?.[1];
  const usage = usageQuery.data?.[1]?.usage;
  const dailyLimitReached = Boolean(usage && usage.remaining <= 0);
  const showScanProgress = Boolean(activeScanId) && activeScan?.status !== "completed";
  const showPreparingReview = Boolean(activeScanId) && activeScan?.status === "completed" && !matchQuery.data?.[1];
  const checkoutTransactions = useMemo(
    () => dedupeTransactions([
      ...getTransactions(checkoutTransactionQuery.data),
      ...getTransactions(previousMonthCheckoutTransactionQuery.data),
    ]),
    [checkoutTransactionQuery.data, previousMonthCheckoutTransactionQuery.data],
  );
  const checkoutSelectableTransactions = useMemo(
    () => getSelectableCheckoutTransactions(checkoutTransactions, date),
    [checkoutTransactions, date],
  );
  const checkoutHasIntegration = hasActiveIntegrationTokens(getActiveTokens(integrationTokenQuery.data));
  const suggestedCheckoutTransaction = useMemo(
    () => checkoutHasIntegration ? getCheckoutLinkSuggestion(checkoutSelectableTransactions, date) : undefined,
    [checkoutHasIntegration, checkoutSelectableTransactions, date],
  );
  const selectedCheckoutTransaction = useMemo(
    () => checkoutSelectableTransactions.find((transaction) => transaction.id === selectedTransactionId),
    [checkoutSelectableTransactions, selectedTransactionId],
  );
  const hasCheckoutLinkableTransactions = checkoutSelectableTransactions.length > 0;

  useEffect(() => {
    if (!initialScanResult || initialScanAppliedRef.current) {
      return;
    }

    initialScanAppliedRef.current = true;
    applyScanResult(initialScanResult);
  }, [initialScanResult]);

  useEffect(() => {
    const [error, data] = matchQuery.data ?? [];
    if (error) {
      setFileError(error.message);
      return;
    }
    if (data) {
      applyScanResult(data);
      setActiveScanId(null);
    }
  }, [matchQuery.data]);

  useEffect(() => {
    const scan = scanQuery.data?.[1];
    if (scan?.status === "failed") {
      setFileError(scan.failureMessage ?? "Receipt processing failed. Please try again.");
      setActiveScanId(null);
    }
  }, [scanQuery.data]);

  useEffect(() => {
    if (
      selectedTransactionId.length > 0 &&
      !checkoutSelectableTransactions.some((transaction) => transaction.id === selectedTransactionId)
    ) {
      setSelectedTransactionId("");
    }
  }, [checkoutSelectableTransactions, selectedTransactionId]);

  function applyScanResult(data: ReceiptScanMatchResult) {
    setScanResult(data);
    setLines(toEditableLines(data));
    if (targetTransaction) {
      setStore(targetTransaction.store ?? data.receipt.store ?? "");
      setDescription(targetTransaction.description ?? "");
      setDate(new Date(targetTransaction.date));
    } else {
      setStore(data.receipt.store ?? "");
      setDate(data.parsedDate ? new Date(data.parsedDate) : new Date());
    }
    setSubmitAttempted(false);
  }

  async function handleFile(file: File) {
    setFileError(null);
    if (!online) {
      setFileError("Receipt scanning requires an internet connection.");
      return;
    }
    if (dailyLimitReached) {
      setFileError("Daily scan limit reached. Try again after the limit resets.");
      return;
    }
    const validationError = validateReceiptFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    const uploadMode = targetTransaction ? "transaction-replacement" : mode;
    uploadMutation.mutate(
      {
        fileName: file.name,
        contentType: file.type as "image/jpeg" | "image/png" | "application/pdf",
        sizeBytes: file.size,
        mode: uploadMode,
      },
      {
        onSuccess: async ([error, data]) => {
          if (error) {
            setFileError(error.message);
            return;
          }
          const response = await fetch(data.uploadUrl, {
            method: "PUT",
            headers: data.uploadHeaders,
            body: file,
          });
          if (!response.ok) {
            setFileError("Upload failed. Please try again.");
            return;
          }
          setActiveScanId(data.scanId);
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
      scrollToFirstInvalidLine();
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
      if (targetTransaction) {
        const payload: CompleteReceiptTransactionReplacementScanDTO = {
          transactionId: targetTransaction.id,
          store: targetTransaction.store ? undefined : store || undefined,
          entries,
        };
        transactionReplacementMutation.mutate(payload, {
          onSuccess: (result) => {
            const [error, transaction] = result;
            if (!error) onComplete(transaction.id);
          },
        });
        return;
      }

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

  function scrollToFirstInvalidLine() {
    const firstInvalidIndex = lines.findIndex(
      (line) =>
        !line.product ||
        !parsePositiveNumber(line.quantity) ||
        !parsePositiveNumber(line.price),
    );
    if (firstInvalidIndex === -1) {
      return;
    }

    const line = lines[firstInvalidIndex];
    const row = lineRefs.current[firstInvalidIndex];
    if (!row) {
      return;
    }

    row.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      const invalidSelector = !line.product
        ? "[data-invalid-control='product'] button"
        : !parsePositiveNumber(line.quantity)
          ? "[data-invalid-control='quantity']"
          : "[data-invalid-control='price']";
      row.querySelector<HTMLElement>(invalidSelector)?.focus({ preventScroll: true });
    }, 250);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileImage className="size-4" />
            Receipt scan
            <Badge variant="secondary">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.currentTarget.value = "";
              }}
            />
            <LoaderButton
              type="button"
              isLoading={uploadMutation.isPending || Boolean(activeScanId)}
              loadingText={
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  {activeScanId ? "Processing receipt..." : "Uploading receipt..."}
                </span>
              }
              disabled={!online || uploadMutation.isPending || Boolean(activeScanId) || dailyLimitReached}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {dailyLimitReached ? "Limit reached" : scanResult ? "Scan another receipt" : "Upload receipt image or PDF"}
            </LoaderButton>
            {scanResult && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setScanResult(null);
                  setLines([]);
                  setFileError(null);
                  setStore(targetTransaction?.store ?? "");
                  setDescription(targetTransaction?.description ?? "");
                  setDate(targetTransaction ? new Date(targetTransaction.date) : new Date());
                }}
              >
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
            )}
            <Button type="button" variant="ghost" asChild>
              <Link to={fallbackHref}>Use manual form</Link>
            </Button>
          </div>
          <DailyUsageIndicator usage={usage} loading={usageQuery.isLoading} />
          {!online && <p className="text-sm text-muted-foreground">Receipt scanning is unavailable while offline.</p>}
          {!scanResult && <p className="text-sm text-muted-foreground">Upload a receipt and review the extracted entries before saving.</p>}
          {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          {scanResult?.receipt.warnings.length ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {scanResult.receipt.warnings.join(" ")}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showScanProgress && (
        <ScanProgressState status={activeScan?.status === "processing" ? "processing" : "upload_pending"} />
      )}

      {showPreparingReview && <ScanPreparingReviewState />}

      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" />
              Review scanned entries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {isReplacingTransaction && targetTransaction ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField>
                    <FormFieldLabel>Store</FormFieldLabel>
                    {targetTransaction.store ? (
                      <Input value={targetTransaction.store} readOnly />
                    ) : (
                      <Input
                        value={store}
                        onChange={(event) => setStore(event.target.value)}
                        placeholder="Store from receipt"
                      />
                    )}
                  </FormField>
                  <FormField>
                    <FormFieldLabel>Date</FormFieldLabel>
                    <Input
                      value={format(new Date(targetTransaction.date), "dd MMM yyyy HH:mm")}
                      readOnly
                    />
                  </FormField>
                </div>
                <FormField>
                  <FormFieldLabel>Description</FormFieldLabel>
                  <Textarea
                    value={targetTransaction.description ?? ""}
                    readOnly
                    placeholder="No description"
                    className="resize-none"
                  />
                </FormField>
              </>
            ) : (
              <>
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
              </>
            )}

            {totalMismatch && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Reviewed total {formatAmount(reviewedTotal)} differs from receipt total {formatAmount(receiptTotal)}. You can still complete the scan.
                </span>
              </div>
            )}

            {originalTotalMismatch && targetTransaction && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Reviewed total {formatAmount(reviewedTotal)} differs from the original transaction total {formatAmount(Math.abs(Number(targetTransaction.totalPrice)))}. Completing the scan will update the transaction total.
                </span>
              </div>
            )}

            <div className="space-y-3">
              {lines.map((line, index) => {
                const invalid = submitAttempted && (!line.product || !parsePositiveNumber(line.quantity) || !parsePositiveNumber(line.price));
                return (
                  <div
                    key={line.id}
                    ref={(element) => {
                      lineRefs.current[index] = element;
                    }}
                    className={`rounded-xl border p-3 ${invalid ? "border-destructive/60" : "border-border"}`}
                  >
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
                        <div data-invalid-control={!line.product ? "product" : undefined}>
                          <ProductSelect
                            products={products}
                            defaultValue={line.product?.name}
                            onValueChange={(product) => handleProductChange(index, product)}
                          />
                        </div>
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
                          aria-invalid={submitAttempted && !parsePositiveNumber(line.quantity)}
                          data-invalid-control={!parsePositiveNumber(line.quantity) ? "quantity" : undefined}
                          onChange={(event) => handleQuantityChange(index, event.target.value)}
                        />
                      </FormField>
                      <FormField>
                        <FormFieldLabel>Unit price</FormFieldLabel>
                        <Input
                          inputMode="decimal"
                          value={line.price}
                          aria-invalid={submitAttempted && !parsePositiveNumber(line.price)}
                          data-invalid-control={!parsePositiveNumber(line.price) ? "price" : undefined}
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

            {mode === "shopping-checkout" && hasCheckoutLinkableTransactions && (
              <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link2 className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium">Link transaction <span className="text-muted-foreground">(Optional)</span></h3>
                  </div>
                  <p className="text-xs text-muted-foreground">Leave empty to create a new transaction, or link a recent transaction to update it.</p>
                </div>

                {selectedCheckoutTransaction ? (
                  <div className="flex items-start justify-between gap-3 rounded-lg border bg-background/70 p-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Linked transaction selected</p>
                      <p className="text-xs text-muted-foreground">{formatTransactionOption(selectedCheckoutTransaction)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedTransactionId("")}>Clear</Button>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-sm font-medium">A new transaction will be created</p>
                    <p className="text-xs text-muted-foreground">Use the smart suggestion or choose a transaction manually to update an existing one.</p>
                  </div>
                )}

                {suggestedCheckoutTransaction && (
                  <button
                    type="button"
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${selectedTransactionId === suggestedCheckoutTransaction.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:bg-muted/30"}`}
                    onClick={() => setSelectedTransactionId(suggestedCheckoutTransaction.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-muted-foreground" /> Smart suggestion</div>
                        <p className="text-xs text-muted-foreground">{formatTransactionOption(suggestedCheckoutTransaction)}</p>
                      </div>
                      <div className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${selectedTransactionId === suggestedCheckoutTransaction.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-transparent"}`}>
                        <Check className="size-3.5" />
                      </div>
                    </div>
                  </button>
                )}

                <FormField>
                  <FormFieldLabel>{checkoutHasIntegration ? "Or choose another transaction" : "Select a transaction"}</FormFieldLabel>
                  <Select value={selectedTransactionId || "new"} onValueChange={(value) => setSelectedTransactionId(value === "new" ? "" : value)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Create a new transaction</SelectItem>
                      {checkoutSelectableTransactions.map((transaction) => (
                        <SelectItem key={transaction.id} value={transaction.id}>{formatTransactionOption(transaction)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            )}
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
