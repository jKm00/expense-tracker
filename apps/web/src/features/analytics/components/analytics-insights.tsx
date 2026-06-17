import { useEffect, useMemo, useState } from "react";
import { Treemap } from "recharts";
import { BarChart3, Package, Tags, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatAmountNoDecimals } from "@/utils/format";
import { FullTransaction } from "@/features/transactions/transactions.models";
import { RecurringWithProduct } from "@/features/recurring/recurring.models";
import { getMergedEntryTags } from "@/features/analytics/analytics.utils";
import dayjs from "dayjs";

type FocusTarget =
  | { type: "tag"; id: string; name: string }
  | { type: "product"; id: string; name: string };

type ExpenseEntry = {
  id: string;
  transactionId: string;
  date: Date | string;
  productId: string;
  productName: string;
  amount: number;
  quantity: number;
  tags: Array<{ id: string; name: string }>;
};

type RankedItem = {
  id: string;
  name: string;
  total: number;
  count: number;
  quantity: number;
};

type TagInsight = RankedItem & {
  share: number;
  fill: string;
};

type ProductInsight = RankedItem & {
  share: number;
  fill: string;
};

const chartConfig = {
  total: {
    label: "Expenses",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const treemapColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatMoney(value: number) {
  return `${formatAmountNoDecimals(value)} NOK`;
}

export function buildExpenseEntries(transactions: FullTransaction[]) {
  return transactions.flatMap((transaction) =>
    transaction.entries.flatMap((entry) => {
      if (entry.type !== "expense") return [];

      return [
        {
          id: entry.id,
          transactionId: transaction.id,
          date: transaction.date,
          productId: entry.products?.id ?? "unknown",
          productName: entry.products?.name ?? "Unknown",
          amount: Math.abs(Number(entry.price)) * entry.quantity,
          quantity: entry.quantity,
          tags: getMergedEntryTags(entry).map((tag) => ({
            id: tag.id,
            name: tag.name,
          })),
        },
      ];
    }),
  );
}

export function buildTagInsights(entries: ExpenseEntry[]): TagInsight[] {
  const totals = new Map<string, RankedItem>();
  const totalExpenses = entries.reduce((sum, entry) => sum + entry.amount, 0);

  for (const entry of entries) {
    const tags = entry.tags.length
      ? entry.tags
      : [{ id: "untagged", name: "Untagged" }];

    for (const tag of tags) {
      const current = totals.get(tag.id) ?? {
        id: tag.id,
        name: tag.name,
        total: 0,
        count: 0,
        quantity: 0,
      };
      current.total += entry.amount;
      current.count += 1;
      current.quantity += entry.quantity;
      totals.set(tag.id, current);
    }
  }

  return Array.from(totals.values())
    .map((item, index) => ({
      ...item,
      share: totalExpenses === 0 ? 0 : (item.total / totalExpenses) * 100,
      fill: treemapColors[index % treemapColors.length],
    }))
    .sort((a, b) => b.total - a.total)
    .map((item, index) => ({
      ...item,
      fill: treemapColors[index % treemapColors.length],
    }));
}

export function buildProductInsights(entries: ExpenseEntry[]): ProductInsight[] {
  const totals = new Map<string, RankedItem>();
  const totalExpenses = entries.reduce((sum, entry) => sum + entry.amount, 0);

  for (const entry of entries) {
    const current = totals.get(entry.productId) ?? {
      id: entry.productId,
      name: entry.productName,
      total: 0,
      count: 0,
      quantity: 0,
    };
    current.total += entry.amount;
    current.count += 1;
    current.quantity += entry.quantity;
    totals.set(entry.productId, current);
  }

  return Array.from(totals.values())
    .map((item, index) => ({
      ...item,
      share: totalExpenses === 0 ? 0 : (item.total / totalExpenses) * 100,
      fill: treemapColors[index % treemapColors.length],
    }))
    .sort((a, b) => b.total - a.total)
    .map((item, index) => ({
      ...item,
      fill: treemapColors[index % treemapColors.length],
    }));
}

export function TagSpendingList({
  tags,
  selectedTarget,
  onSelect,
}: {
  tags: TagInsight[];
  selectedTarget: FocusTarget | null;
  onSelect: (target: FocusTarget) => void;
}) {
  return (
    <Card className="min-h-[360px]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tags className="size-4 text-primary" />
              Expenses by Tag
            </CardTitle>
            <CardDescription>
              Area shows relative tag spend. Click a block to inspect overlaps.
            </CardDescription>
          </div>
          <Badge variant="secondary">Top {Math.min(tags.length, 24)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <InsightEmptyState message="No tagged expense data for this period yet." />
        ) : (
          <SpendingTreemap
            items={tags.slice(0, 24)}
            targetType="tag"
            selectedTarget={selectedTarget}
            onSelect={onSelect}
          />
        )}
      </CardContent>
    </Card>
  );
}

export function ProductTreemap({
  products,
  selectedTarget,
  onSelect,
}: {
  products: ProductInsight[];
  selectedTarget: FocusTarget | null;
  onSelect: (target: FocusTarget) => void;
}) {
  return (
    <Card className="min-h-[360px]">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              Expenses by Product
            </CardTitle>
            <CardDescription>
              Area shows relative product spend. Click a block for details.
            </CardDescription>
          </div>
          <Badge variant="secondary">Top {Math.min(products.length, 24)}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <InsightEmptyState message="No product expense data for this period yet." />
        ) : (
          <SpendingTreemap
            items={products.slice(0, 24)}
            targetType="product"
            selectedTarget={selectedTarget}
            onSelect={onSelect}
          />
        )}
      </CardContent>
    </Card>
  );
}

function SpendingTreemap({
  items,
  targetType,
  selectedTarget,
  onSelect,
}: {
  items: Array<TagInsight | ProductInsight>;
  targetType: FocusTarget["type"];
  selectedTarget: FocusTarget | null;
  onSelect: (target: FocusTarget) => void;
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full aspect-auto">
      <Treemap
        data={items}
        dataKey="total"
        nameKey="name"
        isAnimationActive={false}
        stroke="var(--background)"
        content={
          <TreemapNode
            targetType={targetType}
            selectedTarget={selectedTarget}
            onSelect={onSelect}
          />
        }
      >
        <ChartTooltip
          cursor={false}
          content={({ active, payload }) => {
            const item = payload?.[0]?.payload as
              | TagInsight
              | ProductInsight
              | undefined;
            if (!active || !item) return null;
            return (
              <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {formatMoney(item.total)} · {item.share.toFixed(1)}% · {item.count} entries
                </p>
              </div>
            );
          }}
        />
      </Treemap>
    </ChartContainer>
  );
}

function TreemapNode(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  id?: string;
  name?: string;
  total?: number;
  share?: number;
  count?: number;
  fill?: string;
  targetType?: FocusTarget["type"];
  selectedTarget?: FocusTarget | null;
  onSelect?: (target: FocusTarget) => void;
}) {
  const { x = 0, y = 0, width = 0, height = 0, id, name, total, fill } = props;
  const canLabel = width > 90 && height > 52;
  const canShowDetails = width > 145 && height > 82;
  const targetType = props.targetType ?? "product";
  const hasSelection = props.selectedTarget?.type === targetType;
  const isSelected = hasSelection && props.selectedTarget?.id === id;
  const isDimmed = hasSelection && !isSelected;

  if (!id || !name) return null;

  return (
    <g
      className="cursor-pointer outline-none"
      onClick={() =>
        props.onSelect?.(
          targetType === "tag"
            ? { type: "tag", id, name }
            : { type: "product", id, name },
        )
      }
      role="button"
      tabIndex={0}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={isDimmed ? "var(--muted-foreground)" : (fill ?? "var(--chart-1)")}
        opacity={isDimmed ? 0.22 : 0.86}
        rx={8}
        ry={8}
        stroke="var(--background)"
        strokeWidth={2}
      />
      {canLabel && (
        <foreignObject x={x + 10} y={y + 8} width={width - 20} height={height - 16}>
          <div className="flex h-full flex-col justify-between overflow-hidden text-white">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold drop-shadow">{name}</p>
              {canShowDetails && (
                <p className="mt-1 text-[10px] font-medium opacity-90 drop-shadow">
                  {props.count ?? 0} entries · {(props.share ?? 0).toFixed(1)}%
                </p>
              )}
            </div>
            <p className="text-[11px] font-medium drop-shadow">
              {formatMoney(total ?? 0)}
            </p>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

export function FocusPanel({
  target,
  entries,
  onClose,
}: {
  target: FocusTarget | null;
  entries: ExpenseEntry[];
  onClose?: () => void;
}) {
  const [excludedTagIds, setExcludedTagIds] = useState<string[]>([]);

  useEffect(() => {
    setExcludedTagIds([]);
  }, [target?.id, target?.type]);

  const analysis = useMemo(() => {
    if (!target) return null;
    return target.type === "tag"
      ? buildTagFocus(entries, target, excludedTagIds)
      : buildProductFocus(entries, target);
  }, [entries, excludedTagIds, target]);

  if (!target || !analysis) {
    return null;
  }

  return (
    <FocusPanelContent
      target={target}
      analysis={analysis}
      excludedTagIds={excludedTagIds}
      onToggleExcludedTag={(tagId) =>
        setExcludedTagIds((current) =>
          current.includes(tagId)
            ? current.filter((id) => id !== tagId)
            : [...current, tagId],
        )
      }
      onClearExcludedTags={() => setExcludedTagIds([])}
      onClose={onClose}
    />
  );
}

export function MobileFocusSheet({
  target,
  entries,
  open,
  onOpenChange,
}: {
  target: FocusTarget | null;
  entries: ExpenseEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open && !!target} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88svh] overflow-y-auto rounded-t-2xl px-0 pb-4">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle>Focus details</SheetTitle>
          <SheetDescription>
            Drill into the selected {target?.type ?? "item"} for this period.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <FocusPanel target={target} entries={entries} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FocusPanelContent({
  target,
  analysis,
  excludedTagIds,
  onToggleExcludedTag,
  onClearExcludedTags,
  onClose,
}: {
  target: FocusTarget;
  analysis: ReturnType<typeof buildTagFocus> | ReturnType<typeof buildProductFocus>;
  excludedTagIds: string[];
  onToggleExcludedTag: (tagId: string) => void;
  onClearExcludedTags: () => void;
  onClose?: () => void;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{target.name}</CardTitle>
            <CardDescription>
              {target.type === "tag" ? "Tag focus" : "Product focus"} · {analysis.count} entries
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{analysis.share.toFixed(1)}%</Badge>
            {onClose && (
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="size-4" />
                <span className="sr-only">Close focus panel</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          <MetricPill label="Spend" value={formatMoney(analysis.total)} />
          <MetricPill label="Quantity" value={`${analysis.quantity}`} />
          <MetricPill label="Avg entry" value={formatMoney(analysis.average)} />
          <MetricPill label="Share" value={`${analysis.share.toFixed(1)}%`} />
        </div>

        {target.type === "tag" && "coTags" in analysis && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Often used with
              </h4>
              {excludedTagIds.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onClearExcludedTags}>
                  Clear
                </Button>
              )}
            </div>
            {analysis.coTags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overlapping tags in this period.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {analysis.coTags.slice(0, 10).map((tag) => {
                  const isExcluded = excludedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => onToggleExcludedTag(tag.id)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition hover:border-primary/50",
                        isExcluded
                          ? "border-destructive/50 bg-destructive/10 text-destructive"
                          : "bg-background",
                      )}
                    >
                      {isExcluded ? "Excluding " : ""}{tag.name} · {formatMoney(tag.total)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <FocusRankedSection
          title={target.type === "tag" ? "Top products" : "Related tags"}
          items={analysis.related.slice(0, 6)}
        />

        <div className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recent entries
          </h4>
          <div className="space-y-2">
            {analysis.recent.map((entry) => (
              <div key={`${entry.transactionId}-${entry.id}`} className="rounded-lg border bg-background p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(entry.date).format("D MMM YYYY")} · qty {entry.quantity}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold tabular-nums">
                    {formatMoney(entry.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildTagFocus(
  entries: ExpenseEntry[],
  target: Extract<FocusTarget, { type: "tag" }>,
  excludedTagIds: string[],
) {
  const totalExpenses = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const baseEntries = entries.filter((entry) =>
    entry.tags.some((tag) => tag.id === target.id),
  );
  const filteredEntries = baseEntries.filter(
    (entry) => !entry.tags.some((tag) => excludedTagIds.includes(tag.id)),
  );
  const relatedProducts = rankItems(filteredEntries, (entry) => ({
    id: entry.productId,
    name: entry.productName,
  }));
  const coTags = rankItems(baseEntries, (entry) =>
    entry.tags.filter((tag) => tag.id !== target.id),
  );

  return summarizeFocus(filteredEntries, totalExpenses, relatedProducts, coTags);
}

function buildProductFocus(
  entries: ExpenseEntry[],
  target: Extract<FocusTarget, { type: "product" }>,
) {
  const totalExpenses = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const productEntries = entries.filter((entry) => entry.productId === target.id);
  const relatedTags = rankItems(productEntries, (entry) => entry.tags);

  return summarizeFocus(productEntries, totalExpenses, relatedTags, []);
}

function summarizeFocus(
  entries: ExpenseEntry[],
  totalExpenses: number,
  related: RankedItem[],
  coTags: RankedItem[],
) {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const quantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);

  return {
    total,
    quantity,
    count: entries.length,
    average: entries.length === 0 ? 0 : total / entries.length,
    share: totalExpenses === 0 ? 0 : (total / totalExpenses) * 100,
    related,
    coTags,
    recent: [...entries]
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      .slice(0, 5),
  };
}

function rankItems(
  entries: ExpenseEntry[],
  selector: (entry: ExpenseEntry) =>
    | { id: string; name: string }
    | Array<{ id: string; name: string }>,
) {
  const totals = new Map<string, RankedItem>();

  for (const entry of entries) {
    const selected = selector(entry);
    const items = Array.isArray(selected) ? selected : [selected];

    for (const item of items) {
      const current = totals.get(item.id) ?? {
        id: item.id,
        name: item.name,
        total: 0,
        count: 0,
        quantity: 0,
      };
      current.total += entry.amount;
      current.count += 1;
      current.quantity += entry.quantity;
      totals.set(item.id, current);
    }
  }

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

function FocusRankedSection({ title, items }: { title: string; items: RankedItem[] }) {
  const max = items[0]?.total ?? 0;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No related data for this period.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{item.name}</span>
                <span className="font-mono font-medium tabular-nums">
                  {formatMoney(item.total)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/65"
                  style={{ width: `${max === 0 ? 0 : (item.total / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function InsightEmptyState({ message }: { message: string }) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-lg border border-dashed bg-muted/20 p-6 text-center">
      <div>
        <BarChart3 className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function RecurringSavingsList({ recurrings }: { recurrings: RecurringWithProduct[] }) {
  const items = useMemo(() => {
    return recurrings
      .filter((recurring) => recurring.isActive && recurring.type === "expense")
      .map((recurring) => {
        const monthly = normalizeRecurringMonthlyAmount(recurring);
        return {
          id: recurring.id,
          name: recurring.products?.name ?? "Unknown",
          monthly,
          yearly: monthly * 12,
        };
      })
      .sort((a, b) => b.monthly - a.monthly);
  }, [recurrings]);

  const max = items[0]?.monthly ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring savings opportunities</CardTitle>
        <CardDescription>
          Subscriptions and recurring expenses ranked by monthly impact.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <InsightEmptyState message="No active recurring expenses to rank yet." />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {items.slice(0, 12).map((item) => (
              <div key={item.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatMoney(item.yearly)} / year
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                    {formatMoney(item.monthly)}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive/70"
                    style={{ width: `${max === 0 ? 0 : (item.monthly / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function normalizeRecurringMonthlyAmount(recurring: RecurringWithProduct) {
  const amount = Math.abs(Number(recurring.price));

  switch (recurring.interval) {
    case "weekly":
      return amount * (52 / 12);
    case "yearly":
      return amount / 12;
    case "monthly":
    default:
      return amount;
  }
}
