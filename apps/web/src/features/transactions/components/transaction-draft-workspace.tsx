import {
  EmptyState,
  EmptyStateAction,
  EmptyStateMessage,
} from "@/components/custom/empty-state";
import { FormField, FormFieldLabel } from "@/components/custom/form";
import { LoaderButton } from "@/components/custom/loader.button";
import { ProductSelect } from "@/components/custom/product-select";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProductWithTag } from "@/features/products/products.models";
import { receiptScanningController } from "@/features/receipt-scanning/receipt-scanning.controller";
import { receiptScanningMutations } from "@/features/receipt-scanning/receipt-scanning.mutations";
import {
  ReceiptScanLine,
  ReceiptScanMatchResult,
} from "@/features/receipt-scanning/receipt-scanning.models";
import { receiptScanningQueries } from "@/features/receipt-scanning/receipt-scanning.queries";
import {
  formatReceiptScanStartError,
  RECEIPT_SCAN_FILE_UPLOAD_FAILED_MESSAGE,
  validateReceiptFile,
} from "@/features/receipt-scanning/receipt-scanning.utils";
import {
  DailyUsageIndicator,
  ScanPreparingReviewState,
  ScanProgressState,
} from "@/features/receipt-scanning/components/scan-states";
import { TagSelect } from "@/features/tags/components/tag.select";
import { Tag } from "@/features/tags/tags.models";
import { shoppingMutations } from "@/features/shopping/shopping.mutations";
import { ShoppingListWithItems } from "@/features/shopping/shopping.models";
import { getSelectableCheckoutTransactions } from "@/features/shopping/components/shopping-checkout.utils";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { transactionMutations } from "@/features/transactions/transactions.mutations";
import { transactionQueries } from "@/features/transactions/transactions.queries";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/utils/format";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  Check,
  FileImage,
  Link2,
  Loader2,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type CheckoutStep = "destination" | "details" | "items" | "summary";

type DraftProduct = { id: string | null; name: string };

type DraftEntry = {
  id: string;
  existingEntryId?: string;
  receiptItemName?: string;
  shoppingItemId?: string;
  product: DraftProduct | null;
  quantity: string;
  price: string;
  type: "expense" | "income";
  tagIds: string[];
  suggestions?: ReceiptScanLine["suggestions"];
  confidence?: number;
  source: "manual" | "scan";
};

const CHECKOUT_STEPS: Array<{ id: CheckoutStep; label: string }> = [
  { id: "destination", label: "Destination" },
  { id: "details", label: "Details" },
  { id: "items", label: "Items" },
  { id: "summary", label: "Summary" },
];

type BaseProps = {
  products: ProductWithTag[];
  tags: Tag[];
  initialScanId?: string;
};

type Props = BaseProps &
  (
    | { kind: "new" }
    | { kind: "edit"; transaction: FullTransaction }
    | { kind: "checkout"; shoppingList: ShoppingListWithItems }
  );

function makeId() {
  return Math.random().toString(36).slice(2);
}

function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function fromDateInputValue(value: string) {
  return value ? new Date(`${value}T00:00:00`) : new Date();
}

function parsePositiveNumber(value?: string) {
  if (!value || value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatCalculatedAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getLineTotal(entry: DraftEntry) {
  return (
    (parsePositiveNumber(entry.quantity) ?? 0) *
    (parsePositiveNumber(entry.price) ?? 0)
  );
}

function getTransactions(data: [unknown, FullTransaction[]] | undefined) {
  if (!data || data[0] || !data[1]) return [];
  return data[1];
}

function dedupeTransactions(transactions: FullTransaction[]) {
  return Array.from(
    new Map(
      transactions.map((transaction) => [transaction.id, transaction]),
    ).values(),
  );
}

function formatTransactionOption(transaction: FullTransaction) {
  const title =
    transaction.store ||
    transaction.description ||
    getTransactionSourceLabel(transaction);
  return `${format(transaction.date, "HH:mm")} ${title} · ${formatAmount(transaction.totalPrice)}`;
}

function getTransactionSourceLabel(transaction: FullTransaction) {
  if (transaction.source === "integration") return "Imported transaction";
  if (transaction.source === "shopping") return "Shopping transaction";
  if (transaction.source === "scan") return "Scanned transaction";
  if (transaction.source === "recurring") return "Recurring transaction";
  return "Transaction";
}

function getCheckoutMatchScore(
  transaction: FullTransaction,
  checkoutDate: Date,
) {
  const hoursApart =
    Math.abs(transaction.date.getTime() - checkoutDate.getTime()) / 36e5;
  const reviewBoost = transaction.needsReview ? 80 : 0;
  const proximityScore = Math.max(0, 40 - Math.round(hoursApart));
  return reviewBoost + proximityScore;
}

function getCheckoutMatchLabel(transaction: FullTransaction, score: number) {
  if (transaction.source === "integration" && transaction.needsReview) {
    return "Likely import";
  }
  if (transaction.needsReview) return "Needs review";
  return "Possible match";
}

function blankEntry(source: DraftEntry["source"] = "manual"): DraftEntry {
  return {
    id: makeId(),
    product: null,
    quantity: "1",
    price: "",
    type: "expense",
    tagIds: [],
    source,
  };
}

function productFromSelection(product: ProductWithTag): DraftProduct {
  return {
    id: product.id.length === 0 ? null : product.id,
    name: product.name,
  };
}

function entriesFromTransaction(transaction: FullTransaction): DraftEntry[] {
  return transaction.entries.map((entry) => ({
    id: entry.id,
    existingEntryId: entry.id,
    product: {
      id: entry.products?.id ?? null,
      name: entry.products?.name ?? "",
    },
    quantity: String(entry.quantity),
    price: String(entry.price),
    type: entry.type,
    tagIds: entry.tags.map((tag) => tag.id),
    source: "manual",
  }));
}

function entriesFromShoppingList(list: ShoppingListWithItems): DraftEntry[] {
  return list.items
    .filter((item) => item.checked)
    .map((item) => ({
      id: item.id,
      shoppingItemId: item.id,
      product: { id: item.product.id, name: item.product.name },
      quantity: "1",
      price: "",
      type: "expense",
      tagIds: [],
      source: "manual",
    }));
}

function entriesFromScan(result: ReceiptScanMatchResult): DraftEntry[] {
  return result.lines.map((line) => ({
    id: line.id,
    receiptItemName: line.receiptItemName,
    shoppingItemId: line.shoppingItemId,
    product: line.product,
    quantity: line.quantity,
    price: line.price,
    type: "expense",
    tagIds: [],
    suggestions: line.suggestions,
    confidence: line.confidence,
    source: "scan",
  }));
}

function toSubmitEntry(entry: DraftEntry) {
  return {
    ...(entry.existingEntryId ? { id: entry.existingEntryId } : {}),
    ...(entry.shoppingItemId ? { shoppingItemId: entry.shoppingItemId } : {}),
    product: entry.product!,
    quantity: entry.quantity,
    price: entry.price,
    type: entry.type,
    tagIds: entry.tagIds,
  };
}

function toReceiptSubmitEntry(entry: DraftEntry) {
  return {
    receiptItemName:
      entry.receiptItemName || entry.product?.name || "Manual item",
    ...(entry.shoppingItemId ? { shoppingItemId: entry.shoppingItemId } : {}),
    product: entry.product!,
    quantity: entry.quantity,
    price: entry.price,
    type: "expense" as const,
    tagIds: entry.tagIds,
  };
}

function LineEditorDialog({
  entry,
  tags,
  products,
  scanOnly,
  open,
  onOpenChange,
  onSave,
}: {
  entry: DraftEntry | null;
  tags: Tag[];
  products: ProductWithTag[];
  scanOnly: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: DraftEntry) => void;
}) {
  const [draft, setDraft] = useState<DraftEntry | null>(entry);
  const [total, setTotal] = useState(
    entry ? formatCalculatedAmount(getLineTotal(entry)) : "",
  );
  const [lastEditedField, setLastEditedField] = useState<"price" | "total">(
    "price",
  );
  const selectedTags = useMemo(
    () => tags.filter((tag) => draft?.tagIds.includes(tag.id)),
    [draft?.tagIds, tags],
  );

  useEffect(() => {
    setDraft(entry);
    setTotal(entry ? formatCalculatedAmount(getLineTotal(entry)) : "");
    setLastEditedField("price");
  }, [entry]);

  useEffect(() => {
    if (!draft) return;

    const quantity = parsePositiveNumber(draft.quantity);
    if (!quantity) {
      if (lastEditedField === "price") setTotal("");
      return;
    }

    if (lastEditedField === "total") {
      const parsedTotal = parsePositiveNumber(total);
      if (!parsedTotal) return;

      const nextPrice = formatCalculatedAmount(parsedTotal / quantity);
      if (draft.price !== nextPrice) {
        setDraft((current) =>
          current ? { ...current, price: nextPrice } : current,
        );
      }
      return;
    }

    const price = parsePositiveNumber(draft.price);
    if (!price) {
      setTotal("");
      return;
    }

    const nextTotal = formatCalculatedAmount(price * quantity);
    if (total !== nextTotal) setTotal(nextTotal);
  }, [draft?.price, draft?.quantity, lastEditedField, total]);

  if (!draft) return null;

  const quantity = parsePositiveNumber(draft.quantity);
  const price = parsePositiveNumber(draft.price);
  const canSave = Boolean(draft.product && quantity && price);

  function saveAs(type: "expense" | "income") {
    onSave({ ...draft, type });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {draft.receiptItemName || "Transaction item"}
          </DialogTitle>
          <DialogDescription>
            Edit product, quantity, price, and tags for this line.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {draft.receiptItemName &&
          draft.receiptItemName !== draft.product?.name ? (
            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Receipt text
              </p>
              <p>{draft.receiptItemName}</p>
            </div>
          ) : null}

          <FormField>
            <FormFieldLabel>Product</FormFieldLabel>
            <ProductSelect
              products={products}
              defaultValue={draft.product?.name}
              onValueChange={(product) =>
                setDraft((current) =>
                  current
                    ? { ...current, product: productFromSelection(product) }
                    : current,
                )
              }
            />
            {!draft.product && draft.suggestions?.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {draft.suggestions.map((suggestion) => (
                  <Button
                    key={suggestion.product.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setDraft((current) =>
                        current
                          ? { ...current, product: suggestion.product }
                          : current,
                      )
                    }
                  >
                    {suggestion.product.name}
                  </Button>
                ))}
              </div>
            ) : null}
          </FormField>

          <div className="grid gap-3 sm:grid-cols-3">
            <FormField>
              <FormFieldLabel>Quantity</FormFieldLabel>
              <Input
                inputMode="numeric"
                value={draft.quantity}
                onChange={(event) =>
                  setDraft({ ...draft, quantity: event.target.value })
                }
              />
            </FormField>
            <FormField>
              <FormFieldLabel>Unit price</FormFieldLabel>
              <Input
                inputMode="decimal"
                value={draft.price}
                onChange={(event) => {
                  setLastEditedField("price");
                  setDraft({ ...draft, price: event.target.value });
                }}
              />
            </FormField>
            <FormField>
              <FormFieldLabel>Total</FormFieldLabel>
              <Input
                inputMode="decimal"
                value={total}
                onChange={(event) => {
                  setLastEditedField("total");
                  setTotal(event.target.value);
                }}
              />
            </FormField>
          </div>

          <FormField>
            <FormFieldLabel>
              Tags <span className="text-muted-foreground">(optional)</span>
            </FormFieldLabel>
            <TagSelect
              tags={tags}
              value={selectedTags}
              placeholder="Add tags"
              className="w-full"
              onChange={(nextTags) =>
                setDraft({ ...draft, tagIds: nextTags.map((tag) => tag.id) })
              }
            />
          </FormField>
        </div>
        {scanOnly ? (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() => saveAs("expense")}
            >
              Save item
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter className="grid grid-cols-2">
            <Button
              type="button"
              variant="outline"
              disabled={!canSave}
              className="border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
              onClick={() => saveAs("expense")}
            >
              <Minus className="size-3.5" />
              Expense
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canSave}
              className="border-income/30 text-income hover:bg-income/10 hover:text-income"
              onClick={() => saveAs("income")}
            >
              <Plus className="size-3.5" />
              Income
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryRows({
  entries,
  tags,
  onEdit,
  onRemove,
  scanMode,
  submitAttempted,
}: {
  entries: DraftEntry[];
  tags: Tag[];
  onEdit: (entry: DraftEntry) => void;
  onRemove: (id: string) => void;
  scanMode: boolean;
  submitAttempted: boolean;
}) {
  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );

  if (entries.length === 0) {
    return (
      <EmptyState icon={ShoppingBag}>
        <EmptyStateMessage>No items added yet.</EmptyStateMessage>
      </EmptyState>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      {entries.map((entry, index) => {
        const invalid =
          submitAttempted &&
          (!entry.product ||
            !parsePositiveNumber(entry.quantity) ||
            !parsePositiveNumber(entry.price));
        const matched = entry.source === "scan" && entry.product;
        const needsReview = entry.source === "scan" && !entry.product;
        const entryTotal = getLineTotal(entry);
        return (
          <div
            key={entry.id}
            className={cn(
              "flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40",
              index !== entries.length - 1 && "border-b",
              invalid && "bg-destructive/5",
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onEdit(entry)}
            >
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium">
                  {entry.product?.name ||
                    entry.receiptItemName ||
                    "Select product"}
                </p>
                {scanMode && matched ? (
                  <Badge variant="secondary" className="shrink-0">
                    Matched
                  </Badge>
                ) : null}
                {scanMode && needsReview ? (
                  <Badge variant="destructive" className="shrink-0">
                    Needs match
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {entry.quantity || "?"} x{" "}
                {entry.price ? formatAmount(entry.price) : "missing price"}
                {entry.receiptItemName &&
                entry.receiptItemName !== entry.product?.name
                  ? ` · ${entry.receiptItemName}`
                  : ""}
              </p>
              {entry.tagIds.length > 0 ? (
                <p className="truncate text-xs text-muted-foreground">
                  {entry.tagIds
                    .map((tagId) => tagsById.get(tagId)?.name)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {invalid ? (
                <p className="text-xs text-destructive">
                  Complete product, quantity, and price.
                </p>
              ) : null}
            </button>
            <span
              className={cn(
                "shrink-0 text-sm font-semibold tabular-nums",
                entry.type === "expense" ? "text-expense" : "text-income",
              )}
            >
              {formatAmount(
                entry.type === "expense" ? -entryTotal : entryTotal,
                { sign: true },
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove item"
              onClick={() => onRemove(entry.id)}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function ReceiptPreviewDialog({ scanId }: { scanId: string | null }) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openPreview() {
    if (!scanId) return;
    setError(null);
    const [previewError, data] = await receiptScanningController.getScanFile({
      data: { scanId },
    });
    if (previewError) {
      setError("Could not load the original receipt.");
      return;
    }
    if (data.contentType === "application/pdf") {
      window.open(data.url, "_blank", "noopener,noreferrer");
      return;
    }
    setImageUrl(data.url);
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!scanId}
        onClick={openPreview}
      >
        <ReceiptText className="size-3.5" /> View receipt
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setImageUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Original receipt</DialogTitle>
          </DialogHeader>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Original receipt"
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CheckoutStepper({
  currentStep,
  onStepClick,
  canEnterStep,
}: {
  currentStep: CheckoutStep;
  onStepClick: (step: CheckoutStep) => void;
  canEnterStep: (step: CheckoutStep) => boolean;
}) {
  const currentIndex = CHECKOUT_STEPS.findIndex(
    (step) => step.id === currentStep,
  );

  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="grid grid-cols-4 gap-2">
        {CHECKOUT_STEPS.map((step, index) => {
          const complete = index < currentIndex;
          const active = index === currentIndex;
          const reachable = complete || active || canEnterStep(step.id);
          return (
            <button
              key={step.id}
              type="button"
              disabled={!reachable}
              className="flex min-w-0 flex-col gap-2 rounded-lg text-left outline-none transition-opacity disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onStepClick(step.id)}
            >
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  complete || active ? "bg-primary" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  active
                    ? "text-foreground"
                    : complete
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TransactionDraftWorkspace(props: Props) {
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = receiptScanningMutations.createScanUpload();
  const transactionMutation = transactionMutations.saveTransaction();
  const updateTransactionMutation = transactionMutations.updateTransaction();
  const checkoutMutation = shoppingMutations.completeShopping();
  const scanTransactionMutation =
    receiptScanningMutations.completeTransactionScan();
  const scanReplacementMutation =
    receiptScanningMutations.completeTransactionReplacementScan();
  const scanCheckoutMutation = receiptScanningMutations.completeCheckoutScan();

  const initialEntries = useMemo(() => {
    if (props.kind === "edit") return entriesFromTransaction(props.transaction);
    if (props.kind === "checkout")
      return entriesFromShoppingList(props.shoppingList);
    return [];
  }, [props]);

  const [entries, setEntries] = useState<DraftEntry[]>(initialEntries);
  const [store, setStore] = useState(
    props.kind === "edit" ? (props.transaction.store ?? "") : "",
  );
  const [description, setDescription] = useState(
    props.kind === "edit" ? (props.transaction.description ?? "") : "",
  );
  const [date, setDate] = useState(
    props.kind === "edit" ? new Date(props.transaction.date) : new Date(),
  );
  const [checkoutSuggestionDate] = useState(() => new Date());
  const [activeScanId, setActiveScanId] = useState<string | null>(
    props.initialScanId ?? null,
  );
  const [scanResult, setScanResult] = useState<ReceiptScanMatchResult | null>(
    null,
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DraftEntry | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [discardAction, setDiscardAction] = useState<"rescan" | null>(null);
  const [checkoutDestination, setCheckoutDestination] = useState<
    "new" | "existing"
  >("new");
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("destination");
  const [selectedTransactionId, setSelectedTransactionId] = useState("");

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const usageQuery = useQuery(receiptScanningQueries.listScansOptions());
  const scanQuery = useQuery({
    ...receiptScanningQueries.getScanOptions(activeScanId ?? ""),
    enabled: Boolean(activeScanId),
    refetchInterval: (query) => {
      const data = query.state.data?.[1];
      return data?.status === "upload_pending" || data?.status === "processing"
        ? 2000
        : false;
    },
  });
  const matchQuery = useQuery({
    ...receiptScanningQueries.matchScanOptions(activeScanId ?? ""),
    enabled: scanQuery.data?.[1]?.status === "completed",
  });

  const previousDay = subDays(checkoutSuggestionDate, 1);
  const previousDayUsesDifferentMonth =
    previousDay.getFullYear() !== checkoutSuggestionDate.getFullYear() ||
    previousDay.getMonth() !== checkoutSuggestionDate.getMonth();
  const checkoutTransactionQuery = useQuery({
    ...transactionQueries.getTransactionsOptions(
      checkoutSuggestionDate.getFullYear(),
      checkoutSuggestionDate.getMonth(),
    ),
    enabled: props.kind === "checkout",
  });
  const previousMonthCheckoutTransactionQuery = useQuery({
    ...transactionQueries.getTransactionsOptions(
      previousDay.getFullYear(),
      previousDay.getMonth(),
    ),
    enabled: props.kind === "checkout" && previousDayUsesDifferentMonth,
  });

  const usage = usageQuery.data?.[1]?.usage;
  const dailyLimitReached = Boolean(usage && usage.remaining <= 0);
  const activeScan = scanQuery.data?.[1];
  const hasCompletedScanDraft = Boolean(scanResult);
  const scanOnlyEntries = hasCompletedScanDraft;
  const showScanProgress =
    Boolean(activeScanId) && activeScan?.status !== "completed";
  const showPreparingReview =
    Boolean(activeScanId) &&
    activeScan?.status === "completed" &&
    !matchQuery.data?.[1];
  const receiptTotal = scanResult?.receipt.total
    ? Number(scanResult.receipt.total)
    : null;
  const reviewedTotal = useMemo(
    () => entries.reduce((sum, entry) => sum + getLineTotal(entry), 0),
    [entries],
  );
  const signedTotal = useMemo(
    () =>
      entries.reduce((sum, entry) => {
        const lineTotal = getLineTotal(entry);
        return sum + (entry.type === "expense" ? -lineTotal : lineTotal);
      }, 0),
    [entries],
  );
  const totalMismatch =
    hasCompletedScanDraft &&
    receiptTotal !== null &&
    Math.abs(receiptTotal - reviewedTotal) >= 0.01;
  const originalTotalMismatch =
    props.kind === "edit" &&
    hasCompletedScanDraft &&
    Math.abs(Math.abs(Number(props.transaction.totalPrice)) - reviewedTotal) >=
      0.01;
  const hasInvalidEntries = entries.some(
    (entry) =>
      !entry.product ||
      !parsePositiveNumber(entry.quantity) ||
      !parsePositiveNumber(entry.price),
  );
  const isSubmitting =
    transactionMutation.isPending ||
    updateTransactionMutation.isPending ||
    checkoutMutation.isPending ||
    scanTransactionMutation.isPending ||
    scanReplacementMutation.isPending ||
    scanCheckoutMutation.isPending;

  const checkoutTransactions = useMemo(
    () =>
      dedupeTransactions([
        ...getTransactions(checkoutTransactionQuery.data),
        ...getTransactions(previousMonthCheckoutTransactionQuery.data),
      ]),
    [checkoutTransactionQuery.data, previousMonthCheckoutTransactionQuery.data],
  );
  const checkoutSelectableTransactions = useMemo(
    () =>
      props.kind === "checkout"
        ? getSelectableCheckoutTransactions(checkoutTransactions, checkoutSuggestionDate)
        : [],
    [checkoutSuggestionDate, checkoutTransactions, props.kind],
  );
  const checkoutMatchSuggestions = useMemo(
    () =>
      checkoutSelectableTransactions
        .map((transaction) => ({
          transaction,
          score: getCheckoutMatchScore(transaction, checkoutSuggestionDate),
        }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.transaction.date.getTime() - a.transaction.date.getTime(),
        ),
    [checkoutSelectableTransactions, checkoutSuggestionDate],
  );
  const effectiveCheckoutDestination = checkoutDestination;
  const selectedCheckoutTransaction =
    effectiveCheckoutDestination === "existing"
      ? checkoutTransactions.find(
          (transaction) => transaction.id === selectedTransactionId,
        )
      : undefined;
  const checkedShoppingItems =
    props.kind === "checkout"
      ? props.shoppingList.items.filter((item) => item.checked)
      : [];
  const missingCheckedItems =
    props.kind === "checkout" && hasCompletedScanDraft
      ? checkedShoppingItems.filter(
          (item) => !entries.some((entry) => entry.shoppingItemId === item.id),
        )
      : [];
  const receiptExtras =
    props.kind === "checkout" && hasCompletedScanDraft
      ? entries.filter((entry) => !entry.shoppingItemId)
      : [];
  const matchedCheckoutEntries =
    props.kind === "checkout" && hasCompletedScanDraft
      ? entries.filter((entry) => entry.shoppingItemId)
      : [];

  useEffect(() => {
    const [error, data] = matchQuery.data ?? [];
    if (error) {
      setFileError(error.message);
      return;
    }
    if (data) applyScanResult(data);
  }, [matchQuery.data]);

  useEffect(() => {
    const scan = scanQuery.data?.[1];
    if (scan?.status === "failed") {
      setFileError(
        scan.failureMessage ?? "Receipt processing failed. Please try again.",
      );
      setActiveScanId(null);
    }
  }, [scanQuery.data]);

  useEffect(() => {
    if (
      selectedTransactionId &&
      !checkoutTransactions.some(
        (transaction) => transaction.id === selectedTransactionId,
      )
    ) {
      setSelectedTransactionId("");
      setCheckoutDestination("new");
    }
  }, [
    checkoutDestination,
    checkoutTransactions,
    selectedTransactionId,
  ]);

  useEffect(() => {
    if (props.kind !== "checkout" || !selectedCheckoutTransaction) return;
    setStore(selectedCheckoutTransaction.store ?? "");
    setDescription(selectedCheckoutTransaction.description ?? "");
    setDate(new Date(selectedCheckoutTransaction.date));
  }, [props.kind, selectedCheckoutTransaction]);

  function applyScanResult(result: ReceiptScanMatchResult) {
    setScanResult(result);
    setEntries(entriesFromScan(result));
    if (props.kind === "edit") {
      setStore(props.transaction.store ?? result.receipt.store ?? "");
      setDescription(props.transaction.description ?? "");
      setDate(new Date(props.transaction.date));
    } else {
      setStore(result.receipt.store ?? "");
      setDate(result.parsedDate ? new Date(result.parsedDate) : new Date());
    }
    setSubmitAttempted(false);
  }

  function resetScanDraft() {
    setScanResult(null);
    setActiveScanId(null);
    setFileError(null);
    setEntries(initialEntries);
    setStore(props.kind === "edit" ? (props.transaction.store ?? "") : "");
    setDescription(
      props.kind === "edit" ? (props.transaction.description ?? "") : "",
    );
    setDate(
      props.kind === "edit" ? new Date(props.transaction.date) : new Date(),
    );
  }

  async function handleFile(file: File) {
    setFileError(null);
    if (!online) {
      setFileError("Receipt scanning requires an internet connection.");
      return;
    }
    if (dailyLimitReached) {
      setFileError(
        "Daily scan limit reached. Try again after the limit resets.",
      );
      return;
    }
    const validationError = validateReceiptFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }

    const mode =
      props.kind === "edit"
        ? "transaction-replacement"
        : props.kind === "checkout"
          ? "shopping-checkout"
          : "transaction";
    uploadMutation.mutate(
      {
        fileName: file.name,
        contentType: file.type as
          | "image/jpeg"
          | "image/png"
          | "application/pdf",
        sizeBytes: file.size,
        mode,
      },
      {
        onSuccess: async ([error, data]) => {
          if (error) {
            setFileError(formatReceiptScanStartError(error.message));
            return;
          }
          let response: Response;
          try {
            response = await fetch(data.uploadUrl, {
              method: "PUT",
              headers: data.uploadHeaders,
              body: file,
            });
          } catch {
            setFileError(RECEIPT_SCAN_FILE_UPLOAD_FAILED_MESSAGE);
            return;
          }
          if (!response.ok) {
            setFileError(RECEIPT_SCAN_FILE_UPLOAD_FAILED_MESSAGE);
            return;
          }
          setActiveScanId(data.scanId);
        },
        onError: (error) => setFileError(formatReceiptScanStartError(error)),
      },
    );
  }

  function addEntry() {
    const entry = blankEntry(hasCompletedScanDraft ? "scan" : "manual");
    setEntries((current) => [...current, entry]);
    setEditingEntry(entry);
  }

  function saveEntry(entry: DraftEntry) {
    setEntries((current) =>
      current.map((currentEntry) =>
        currentEntry.id === entry.id ? entry : currentEntry,
      ),
    );
  }

  function submit() {
    setSubmitAttempted(true);
    if (entries.length === 0 || hasInvalidEntries) return;

    if (props.kind === "new") {
      if (hasCompletedScanDraft) {
        scanTransactionMutation.mutate(
          {
            store,
            description,
            date,
            entries: entries.map(toReceiptSubmitEntry),
          },
          {
            onSuccess: ([error, transaction]) =>
              !error &&
              navigate({
                to: "/dashboard/transactions/$id",
                params: { id: transaction.id },
              }),
          },
        );
        return;
      }
      transactionMutation.mutate(
        {
          store,
          description,
          source: "manual",
          date,
          entries: entries.map(toSubmitEntry),
        },
        {
          onSuccess: ([error, transaction]) =>
            !error &&
            navigate({
              to: "/dashboard/transactions/$id",
              params: { id: transaction.id },
            }),
        },
      );
      return;
    }

    if (props.kind === "edit") {
      if (hasCompletedScanDraft) {
        scanReplacementMutation.mutate(
          {
            transactionId: props.transaction.id,
            store: props.transaction.store ? undefined : store || undefined,
            entries: entries.map(toReceiptSubmitEntry),
          },
          {
            onSuccess: ([error, transaction]) =>
              !error &&
              navigate({
                to: "/dashboard/transactions/$id",
                params: { id: transaction.id },
              }),
          },
        );
        return;
      }
      updateTransactionMutation.mutate(
        {
          transactionId: props.transaction.id,
          store,
          description,
          date,
          entries: entries.map(toSubmitEntry),
        },
        {
          onSuccess: ([error, transaction]) =>
            !error &&
            navigate({
              to: "/dashboard/transactions/$id",
              params: { id: transaction.id },
            }),
        },
      );
      return;
    }

    const shoppingItemIds = Array.from(
      new Set(
        entries.flatMap((entry) =>
          entry.shoppingItemId ? [entry.shoppingItemId] : [],
        ),
      ),
    );
    if (hasCompletedScanDraft) {
      scanCheckoutMutation.mutate(
        {
          store,
          description,
          date,
          transactionId:
            effectiveCheckoutDestination === "existing"
              ? selectedTransactionId || undefined
              : undefined,
          keepUncheckedItems: true,
          entries: entries.map(toReceiptSubmitEntry),
        },
        {
          onSuccess: ([error, transaction]) =>
            !error &&
            navigate({
              to: "/dashboard/transactions/$id",
              params: { id: transaction.id },
            }),
        },
      );
      return;
    }

    checkoutMutation.mutate(
      {
        store,
        description,
        date,
        transactionId:
          effectiveCheckoutDestination === "existing"
            ? selectedTransactionId || undefined
            : undefined,
        keepUncheckedItems: true,
        shoppingItemIds,
        entries: entries.map(toSubmitEntry),
      },
      {
        onSuccess: ([error, transaction]) =>
          !error &&
          navigate({
            to: "/dashboard/transactions/$id",
            params: { id: transaction.id },
          }),
      },
    );
  }

  function goToCheckoutSummary() {
    setSubmitAttempted(true);
    if (entries.length === 0 || hasInvalidEntries) return;
    setCheckoutStep("summary");
  }

  function canEnterCheckoutStep(step: CheckoutStep) {
    if (step === "summary") return entries.length > 0 && !hasInvalidEntries;
    return true;
  }

  function goToCheckoutStep(step: CheckoutStep) {
    if (step === "summary") {
      goToCheckoutSummary();
      return;
    }

    setCheckoutStep(step);
  }

  const submitLabel =
    props.kind === "new"
      ? "Create transaction"
      : props.kind === "edit"
        ? "Update transaction"
        : selectedCheckoutTransaction
          ? "Update linked transaction"
          : "Complete checkout";
  const submitDescription =
    props.kind === "new"
      ? "A new transaction will be created."
      : props.kind === "edit"
        ? hasCompletedScanDraft
          ? `This will replace ${props.transaction.entries.length} current entries.`
          : "This transaction will be updated."
        : selectedCheckoutTransaction
          ? `Checkout will update ${formatTransactionOption(selectedCheckoutTransaction)}.`
          : "Checkout will create a new transaction.";
  const showCheckoutDestination =
    props.kind === "checkout" && checkoutStep === "destination";
  const showDetails = props.kind !== "checkout" || checkoutStep === "details";
  const showCheckoutItems =
    props.kind === "checkout" && checkoutStep === "items";
  const showItems = props.kind !== "checkout" || showCheckoutItems;
  const showCheckoutSummary =
    props.kind === "checkout" && checkoutStep === "summary";

  if (props.kind === "checkout" && checkedShoppingItems.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState icon={ShoppingBag}>
            <EmptyStateMessage>
              Check at least one shopping item before checkout.
            </EmptyStateMessage>
            <EmptyStateAction>
              <Button asChild>
                <Link to="/dashboard/shopping">Back to shopping list</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dashboard/transactions/new">
                  Create normal transaction
                </Link>
              </Button>
            </EmptyStateAction>
          </EmptyState>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {props.kind === "checkout" ? (
        <CheckoutStepper
          currentStep={checkoutStep}
          canEnterStep={canEnterCheckoutStep}
          onStepClick={goToCheckoutStep}
        />
      ) : null}

      {showCheckoutDestination ? (
        <Card className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 size-44 rounded-full bg-emerald-500/10 blur-3xl" />
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="size-4" /> Transaction destination
                </CardTitle>
                <CardDescription>
                  Start fresh, or let the match radar suggest imported
                  transactions to itemize.
                </CardDescription>
              </div>
              {checkoutMatchSuggestions.length > 0 ? (
                <Badge
                  variant="secondary"
                  className="gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="size-3.5" />{" "}
                  {checkoutMatchSuggestions.length} scanned
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              type="button"
              className={cn(
                "group relative w-full overflow-hidden rounded-2xl border bg-background/85 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                effectiveCheckoutDestination === "new" &&
                  "border-primary bg-primary/5 shadow-sm",
              )}
              onClick={() => {
                setCheckoutDestination("new");
                setSelectedTransactionId("");
                setStore("");
                setDescription("");
                setDate(new Date());
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Plus className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Create a fresh transaction</p>
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full border",
                        effectiveCheckoutDestination === "new"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-transparent",
                      )}
                    >
                      <Check className="size-3.5" />
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No existing transaction will be changed. The checkout items
                    become a brand new transaction.
                  </p>
                </div>
              </div>
            </button>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Sparkles className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Match suggestions</p>
                  <p className="text-xs text-muted-foreground">
                    Best candidates are sorted to the top. Nothing is selected
                    automatically.
                  </p>
                </div>
              </div>

              {checkoutMatchSuggestions.length > 0 ? (
                <div className="space-y-2">
                  {checkoutMatchSuggestions.map(
                    ({ transaction, score }, index) => {
                      const selected =
                        selectedTransactionId === transaction.id &&
                        effectiveCheckoutDestination === "existing";
                      const suggested = index === 0;
                      return (
                        <button
                          key={transaction.id}
                          type="button"
                          className={cn(
                            "w-full rounded-2xl border bg-background/75 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background hover:shadow-sm",
                            selected && "border-primary bg-primary/5 shadow-sm",
                          )}
                          onClick={() => {
                            setCheckoutDestination("existing");
                            setSelectedTransactionId(transaction.id);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                                suggested || transaction.needsReview
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              <Sparkles className="size-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">
                                  {transaction.store ||
                                    transaction.description ||
                                    getTransactionSourceLabel(transaction)}
                                </p>
                                <Badge
                                  variant={suggested ? "default" : "secondary"}
                                >
                                  {suggested ? "Recommended" : getCheckoutMatchLabel(transaction, score)}
                                </Badge>
                                {suggested && transaction.needsReview ? (
                                  <Badge variant="secondary">
                                    {getCheckoutMatchLabel(transaction, score)}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {format(transaction.date, "dd MMM, HH:mm")} ·{" "}
                                {formatAmount(transaction.totalPrice)}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-full border",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-transparent",
                              )}
                            >
                              <Check className="size-3.5" />
                            </span>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
                  No matching transactions were found around this checkout date.
                  Fresh transaction is the safe default.
                </div>
              )}
            </div>

            {selectedCheckoutTransaction ? (
              <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
                <p className="font-medium">
                  Updating{" "}
                  {formatTransactionOption(selectedCheckoutTransaction)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  The next step starts with this transaction's details. Change
                  them only if they should be overwritten.
                </p>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="justify-end border-t bg-card/95">
            <Button type="button" onClick={() => goToCheckoutStep("details")}>
              Continue
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {props.kind === "edit" && hasCompletedScanDraft ? (
        <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Receipt review will replace {props.transaction.entries.length}{" "}
            current entries in this transaction.
          </span>
        </div>
      ) : null}

      {showItems ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileImage className="size-4" /> Optional receipt scan
            </CardTitle>
            <CardDescription>
              Upload a receipt to replace the current draft with scanned lines, or keep entering items manually.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <LoaderButton
                type="button"
                isLoading={
                  uploadMutation.isPending ||
                  Boolean(activeScanId && !scanResult)
                }
                disabled={
                  !online ||
                  uploadMutation.isPending ||
                  Boolean(activeScanId && !scanResult) ||
                  dailyLimitReached
                }
                onClick={() => {
                  if (scanResult) {
                    setDiscardAction("rescan");
                    setDiscardDialogOpen(true);
                    return;
                  }
                  inputRef.current?.click();
                }}
              >
                {uploadMutation.isPending ||
                Boolean(activeScanId && !scanResult) ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                {dailyLimitReached
                  ? "Limit reached"
                  : scanResult
                    ? "Scan another receipt"
                    : "Upload receipt"}
              </LoaderButton>
              {scanResult ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetScanDraft}
                >
                  <RotateCcw className="size-3.5" /> Discard scan draft
                </Button>
              ) : null}
              <ReceiptPreviewDialog scanId={activeScanId} />
            </div>
            <DailyUsageIndicator usage={usage} loading={usageQuery.isLoading} />
            {!online ? (
              <p className="text-sm text-muted-foreground">
                Receipt scanning needs internet. You can use manual entry
                instead.
              </p>
            ) : null}
            {!scanResult && dailyLimitReached ? (
              <p className="text-sm text-muted-foreground">
                Your daily scan limit is reached. Existing scan drafts can still
                be reviewed.
              </p>
            ) : null}
            {!scanResult && !dailyLimitReached ? (
              <p className="text-sm text-muted-foreground">
                Upload a receipt, then review matched and unmatched entries
                before saving.
              </p>
            ) : null}
            {fileError ? (
              <p className="text-sm text-destructive">{fileError}</p>
            ) : null}
            {scanResult?.receipt.warnings.length ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                {scanResult.receipt.warnings.join(" ")}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showScanProgress && showItems ? (
        <ScanProgressState
          status={
            activeScan?.status === "processing"
              ? "processing"
              : "upload_pending"
          }
        />
      ) : null}
      {showPreparingReview && showItems ? <ScanPreparingReviewState /> : null}

      {showDetails ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <FormField>
                <FormFieldLabel>
                  Store{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </FormFieldLabel>
                <Input
                  value={store}
                  onChange={(event) => setStore(event.target.value)}
                  placeholder="Store"
                />
              </FormField>
              <FormField>
                <FormFieldLabel>Date</FormFieldLabel>
                <Input
                  type="date"
                  value={toDateInputValue(date)}
                  onChange={(event) =>
                    setDate(fromDateInputValue(event.target.value))
                  }
                />
              </FormField>
            </div>
            <FormField>
              <FormFieldLabel>
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </FormFieldLabel>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional note"
                className="resize-none"
              />
            </FormField>
          </CardContent>
          {props.kind === "checkout" ? (
            <CardFooter className="justify-between border-t bg-card/95">
              <Button
                type="button"
                variant="outline"
                onClick={() => goToCheckoutStep("destination")}
              >
                Back
              </Button>
              <Button type="button" onClick={() => goToCheckoutStep("items")}>
                Continue
              </Button>
            </CardFooter>
          ) : null}
        </Card>
      ) : null}

      {props.kind === "checkout" && hasCompletedScanDraft && showItems ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checkout reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border p-3">
              <p className="text-sm font-medium">Matched shopping items</p>
              <p className="text-2xl font-semibold">
                {matchedCheckoutEntries.length}
              </p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-sm font-medium">Receipt extras</p>
              <p className="text-2xl font-semibold">{receiptExtras.length}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-sm font-medium">Checked items not found</p>
              <p className="text-2xl font-semibold">
                {missingCheckedItems.length}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {showItems ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="size-4" /> Items
            </CardTitle>
            {props.kind === "checkout" ? (
              <CardDescription>
                Add or review the line items before checkout is completed.
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            {totalMismatch ? (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Reviewed total {formatAmount(reviewedTotal)} differs from
                  receipt total {formatAmount(receiptTotal)}.
                </span>
              </div>
            ) : null}
            {originalTotalMismatch ? (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Reviewed total differs from the original transaction total{" "}
                  {formatAmount(Math.abs(Number(props.transaction.totalPrice)))}
                  .
                </span>
              </div>
            ) : null}
            <EntryRows
              entries={entries}
              tags={props.tags}
              onEdit={setEditingEntry}
              onRemove={(id) =>
                setEntries((current) =>
                  current.filter((entry) => entry.id !== id),
                )
              }
              scanMode={hasCompletedScanDraft}
              submitAttempted={submitAttempted}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={addEntry}
            >
              <Plus className="size-3.5" /> Add item
            </Button>
          </CardContent>
          {props.kind === "checkout" ? (
            <CardFooter className="flex flex-col gap-3 border-t bg-card/95">
              <div className="flex w-full gap-2 sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={() => goToCheckoutStep("details")}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 sm:flex-none"
                  disabled={entries.length === 0}
                  onClick={goToCheckoutSummary}
                >
                  Review summary
                </Button>
              </div>
              <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Total: <span className="font-medium text-foreground tabular-nums">{formatAmount(-reviewedTotal, { sign: true })}</span>
                </p>
                <p className="text-xs">Unchecked shopping-list items will be kept.</p>
              </div>
            </CardFooter>
          ) : (
            <CardFooter className="flex flex-col gap-3 border-t bg-card/95 sm:sticky sm:bottom-0 sm:z-10 sm:flex-row sm:items-center sm:justify-between sm:backdrop-blur sm:supports-[backdrop-filter]:bg-card/80">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{submitDescription}</p>
                <p className="font-medium">
                  Total:{" "}
                  <span className="tabular-nums">
                    {formatAmount(
                      props.kind === "new" && !hasCompletedScanDraft
                        ? signedTotal
                        : -reviewedTotal,
                      { sign: true },
                    )}
                  </span>
                </p>
              </div>
              <LoaderButton
                type="button"
                isLoading={isSubmitting}
                disabled={isSubmitting || entries.length === 0}
                onClick={submit}
              >
                {submitLabel}
              </LoaderButton>
            </CardFooter>
          )}
        </Card>
      ) : null}

      {showCheckoutSummary ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review checkout</CardTitle>
            <CardDescription>
              Confirm the destination, details, and item total before completing
              checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border p-3">
                <p className="text-sm font-medium">Destination</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedCheckoutTransaction
                    ? `Update ${formatTransactionOption(selectedCheckoutTransaction)}`
                    : "Create a new transaction"}
                </p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-sm font-medium">Total</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatAmount(-reviewedTotal, { sign: true })}
                </p>
              </div>
            </div>
            <div className="rounded-xl border p-3 text-sm">
              <p className="font-medium">Details</p>
              <dl className="mt-2 grid gap-2 text-muted-foreground sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide">Store</dt>
                  <dd className="text-foreground">{store || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide">Date</dt>
                  <dd className="text-foreground">
                    {format(date, "dd MMM yyyy")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide">Items</dt>
                  <dd className="text-foreground">{entries.length}</dd>
                </div>
              </dl>
              {description ? (
                <p className="mt-3 text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {totalMismatch ? (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Reviewed total {formatAmount(reviewedTotal)} differs from
                  receipt total {formatAmount(receiptTotal)}.
                </span>
              </div>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Unchecked shopping-list items will stay on the list.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 border-t bg-card/95 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => goToCheckoutStep("items")}
            >
              Back
            </Button>
            <LoaderButton
              type="button"
              className="w-full sm:w-auto"
              isLoading={isSubmitting}
              disabled={isSubmitting || entries.length === 0}
              onClick={submit}
            >
              {submitLabel}
            </LoaderButton>
          </CardFooter>
        </Card>
      ) : null}

      <LineEditorDialog
        entry={editingEntry}
        products={props.products}
        tags={props.tags}
        scanOnly={scanOnlyEntries}
        open={Boolean(editingEntry)}
        onOpenChange={(open) => !open && setEditingEntry(null)}
        onSave={saveEntry}
      />

      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-amber-500/10 text-amber-600">
              <AlertTriangle className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>Discard current scan draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the reviewed receipt lines from this page. The
              uploaded scan record will remain in scan history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep draft</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = discardAction;
                resetScanDraft();
                setDiscardDialogOpen(false);
                setDiscardAction(null);
                if (action === "rescan") {
                  inputRef.current?.click();
                }
              }}
            >
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
