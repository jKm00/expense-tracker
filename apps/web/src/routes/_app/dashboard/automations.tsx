import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/custom/page-header";
import { LoaderButton } from "@/components/custom/loader.button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createAutomationTokenSchema,
  type CreateAutomationTokenDTO,
} from "@/features/automation/automation.dtos";
import { automationMutations } from "@/features/automation/automation.mutations";
import { automationQueries } from "@/features/automation/automation.queries";
import type {
  AutomationRequestLogListItem,
  AutomationTokenMetadata,
} from "@/features/automation/automation.models";
import { env } from "@/config/env";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  Copy,
  History,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard/automations")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      automationQueries.getAutomationTokensOptions(),
    );
    await context.queryClient.prefetchInfiniteQuery(
      automationQueries.getAutomationRequestLogsOptions(null),
    );

    const showBetaBadge =
      env.AUTOMATION_BETA_BADGE.trim().toLowerCase() !== "false";

    return { showBetaBadge };
  },
  component: RouteComponent,
});

function formatDateTime(value: Date | null) {
  if (!value) {
    return "Never";
  }

  return value.toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(durationMs: number | null) {
  if (durationMs == null) {
    return "Unknown";
  }

  return `${durationMs} ms`;
}

function formatRequestPayload(value: string | null) {
  if (!value) {
    return "Not captured";
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function getStatusBadgeVariant(
  statusCode: number,
): "secondary" | "destructive" | "outline" {
  if (statusCode >= 400) {
    return "destructive";
  }

  if (statusCode >= 200 && statusCode < 300) {
    return "secondary";
  }

  return "outline";
}

function RouteComponent() {
  const { showBetaBadge } = Route.useLoaderData();
  const {
    data: [expectedError, tokens],
    error: unexpectedError,
  } = useSuspenseQuery(automationQueries.getAutomationTokensOptions());

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Automations unavailable</ExpectedErrorTitle>
        <ExpectedErrorMessage>{expectedError.message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>
          <span className="inline-flex items-center gap-2">
            Automations
            {showBetaBadge ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                BETA
              </Badge>
            ) : null}
          </span>
        </PageHeaderTitle>
        <PageHeaderDescription>
          Manage API tokens and configure Apple Pay imports.
        </PageHeaderDescription>
      </PageHeader>

      <CreateTokenCard />

      <TokenListCard tokens={tokens} />

      <AutomationLogsCard tokens={tokens} />
    </div>
  );
}

function CreateTokenCard() {
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const createToken = automationMutations.createAutomationToken();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAutomationTokenDTO>({
    resolver: zodResolver(createAutomationTokenSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = handleSubmit((data) => {
    createToken.mutate(data, {
      onSuccess: ([error, result]) => {
        if (error) {
          const reason = error.reason;
          const message =
            reason === "AUTOMATION_TOKEN_LIMIT_REACHED"
              ? "You already have 10 active tokens. Revoke one before creating another."
              : "Failed to create token. Please try again.";
          toast.error(message);
          return;
        }

        setRevealedToken(result.token);
        reset({ name: "" });
        toast.success("Token created. Copy it now - it is shown only once.");
      },
    });
  });

  async function handleCopyToken() {
    if (!revealedToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(revealedToken);
      toast.success("Token copied");
    } catch {
      toast.error("Failed to copy token");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create API token</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="automation-token-name">Token name</Label>
            <Input
              id="automation-token-name"
              placeholder="Apple Pay iPhone"
              {...register("name")}
            />
            {errors.name?.message ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <LoaderButton
            type="submit"
            size="sm"
            isLoading={createToken.isPending}
            disabled={createToken.isPending}
          >
            <KeyRound className="size-4" />
            Create token
          </LoaderButton>
        </form>

        {revealedToken ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Token ready
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Copy and store it now. You will not be able to see it again.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                Shown once
              </Badge>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Input
                readOnly
                value={revealedToken}
                className="bg-background font-mono text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleCopyToken}
              >
                <Copy className="size-4" />
                Copy token
              </Button>
            </div>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">
                Keep this token safe. You will use it in the authorization step
                below.
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TokenListCard({ tokens }: { tokens: AutomationTokenMetadata[] }) {
  const revokeToken = automationMutations.revokeAutomationToken();
  const activeTokens = useMemo(
    () => tokens.filter((token) => !token.revokedAt),
    [tokens],
  );
  const revokedTokens = useMemo(
    () => tokens.filter((token) => token.revokedAt),
    [tokens],
  );

  const activeCount = useMemo(
    () => tokens.filter((token) => !token.revokedAt).length,
    [tokens],
  );

  function handleRevoke(tokenId: string) {
    revokeToken.mutate(
      { tokenId },
      {
        onSuccess: ([error]) => {
          if (error) {
            toast.error(error.message);
            return;
          }

          toast.success("Token revoked");
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tokens ({activeCount}/10 active)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeTokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">
              No active tokens
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a token above to enable Apple Pay automation imports.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            {activeTokens.map((token, index) => (
              <ActiveTokenRow
                key={token.id}
                token={token}
                isLast={index === activeTokens.length - 1}
                isRevoking={revokeToken.isPending}
                onRevoke={handleRevoke}
              />
            ))}
          </div>
        )}

        {revokedTokens.length > 0 ? (
          <details className="group overflow-hidden rounded-xl border border-border/60 bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <ShieldX className="size-3" />
                  Revoked
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {revokedTokens.length} token
                  {revokedTokens.length === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border/40">
              {revokedTokens.map((token, index) => (
                <RevokedTokenRow
                  key={token.id}
                  token={token}
                  isLast={index === revokedTokens.length - 1}
                />
              ))}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActiveTokenRow({
  token,
  isLast,
  isRevoking,
  onRevoke,
}: {
  token: {
    id: string;
    name: string;
    tokenPrefix: string;
    createdAt: Date;
    lastUsedAt: Date | null;
  };
  isLast: boolean;
  isRevoking: boolean;
  onRevoke: (tokenId: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-border/40"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{token.name}</p>
          <Badge variant="secondary">
            <ShieldCheck className="size-3" />
            Active
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Prefix: <span className="font-mono">{token.tokenPrefix}</span> -
          Created {formatDateTime(token.createdAt)} - Last used{" "}
          {formatDateTime(token.lastUsedAt)}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRevoke(token.id)}
        disabled={isRevoking}
      >
        <Trash2 className="size-4" />
        Revoke
      </Button>
    </div>
  );
}

function RevokedTokenRow({
  token,
  isLast,
}: {
  token: {
    name: string;
    tokenPrefix: string;
    createdAt: Date;
    revokedAt: Date | null;
  };
  isLast: boolean;
}) {
  return (
    <div className={`px-4 py-3 ${isLast ? "" : "border-b border-border/40"}`}>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">{token.name}</p>
        <Badge variant="outline">
          <ShieldX className="size-3" />
          Revoked
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Prefix: <span className="font-mono">{token.tokenPrefix}</span> - Created{" "}
        {formatDateTime(token.createdAt)} - Revoked{" "}
        {formatDateTime(token.revokedAt)}
      </p>
    </div>
  );
}

function AutomationLogsCard({ tokens }: { tokens: AutomationTokenMetadata[] }) {
  const [selectedTokenId, setSelectedTokenId] = useState<string>("all");
  const [selectedLog, setSelectedLog] =
    useState<AutomationRequestLogListItem | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const selectedFilterTokenId =
    selectedTokenId === "all" ? null : selectedTokenId;

  const {
    data,
    error: logsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery(
    automationQueries.getAutomationRequestLogsOptions(selectedFilterTokenId),
  );

  const [expectedLogsError, logsPage] = useMemo(() => {
    if (!data) {
      return [null, null] as const;
    }

    const firstExpectedError = data.pages
      .map(([pageError]) => pageError)
      .find(Boolean);

    if (firstExpectedError) {
      return [firstExpectedError, null] as const;
    }

    return [
      null,
      data.pages
        .map(([, page]) => page)
        .filter(
          (page): page is NonNullable<(typeof data.pages)[number][1]> =>
            page !== null,
        ),
    ] as const;
  }, [data]);

  const logs = useMemo(
    () => logsPage?.flatMap((page) => page.logs) ?? [],
    [logsPage],
  );

  useEffect(() => {
    if (!selectedLog) {
      return;
    }

    const selectedStillVisible = logs.some((log) => log.id === selectedLog.id);
    if (!selectedStillVisible) {
      setSelectedLog(null);
    }
  }, [logs, selectedLog]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasNextPage || isFetchingNextPage || expectedLogsError) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [
    expectedLogsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    logs.length,
  ]);

  return (
    <>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Automation logs
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent automation requests with request and response details.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <Label htmlFor="automation-log-token-filter" className="text-xs">
              Filter by token
            </Label>
            <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
              <SelectTrigger
                id="automation-log-token-filter"
                className="mt-1 w-full"
              >
                <SelectValue placeholder="All tokens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tokens</SelectItem>
                {tokens.map((token) => (
                  <SelectItem key={token.id} value={token.id}>
                    {token.name} ({token.tokenPrefix})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {logsError ? (
            <UnexpectedError />
          ) : expectedLogsError ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">
                Unable to load logs
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {expectedLogsError.message}
              </p>
            </div>
          ) : isPending ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              Loading automation logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">
                No logs found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedFilterTokenId
                  ? "No requests have been logged for the selected token yet."
                  : "Automation requests will appear here once imports start coming in."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              {logs.map((log, index) => (
                <AutomationLogRow
                  key={log.id}
                  log={log}
                  isLast={index === logs.length - 1}
                  onClick={() => setSelectedLog(log)}
                />
              ))}
            </div>
          )}

          <div
            ref={loadMoreRef}
            className="flex min-h-10 items-center justify-center"
          >
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading more logs...
              </div>
            ) : logs.length > 0 && !hasNextPage ? (
              <p className="text-sm text-muted-foreground">
                You have reached the end of the log history.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <AutomationLogDetailsSheet
        log={selectedLog}
        open={selectedLog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
          }
        }}
      />
    </>
  );
}

function AutomationLogRow({
  log,
  isLast,
  onClick,
}: {
  log: AutomationRequestLogListItem;
  isLast: boolean;
  onClick: () => void;
}) {
  const tokenLabel = log.tokenName
    ? `${log.tokenName} (${log.tokenPrefix ?? log.requestTokenPrefix ?? "unknown"})`
    : log.requestTokenPrefix
      ? `Unknown token (${log.requestTokenPrefix})`
      : "Unknown token";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 sm:gap-4 ${isLast ? "" : "border-b border-border/40"}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{tokenLabel}</p>
          {log.provider ? (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {log.provider}
            </Badge>
          ) : null}
          {log.duplicate ? <Badge variant="outline">Duplicate</Badge> : null}
        </div>
        <p className="text-xs text-muted-foreground sm:hidden">
          {formatDateTime(log.createdAt)}
        </p>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {formatDateTime(log.createdAt)} - {log.requestMethod}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 sm:gap-2">
        <Badge variant={getStatusBadgeVariant(log.responseStatus)}>
          {log.responseStatus}
        </Badge>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {formatDuration(log.durationMs)}
        </p>
      </div>
    </button>
  );
}

function AutomationLogDetailsSheet({
  log,
  open,
  onOpenChange,
}: {
  log: AutomationRequestLogListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-[90vw] data-[side=right]:sm:w-[85vw] data-[side=right]:sm:max-w-[800px]"
      >
        <SheetHeader>
          <SheetTitle>Automation request details</SheetTitle>
          <SheetDescription>
            Detailed request and response metadata for this automation log
            entry.
          </SheetDescription>
        </SheetHeader>

        {log ? (
          <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <LogDetailItem
                label="Timestamp"
                value={formatDateTime(log.createdAt)}
              />
              <LogDetailItem
                label="Status code"
                value={String(log.responseStatus)}
              />
              <LogDetailItem
                label="Token"
                value={log.tokenName ?? "Unknown token"}
              />
              <LogDetailItem
                label="Token prefix"
                value={log.tokenPrefix ?? log.requestTokenPrefix ?? "Unknown"}
              />
              <LogDetailItem label="Method" value={log.requestMethod} />
              <LogDetailItem label="Path" value={log.requestPath} />
              <LogDetailItem
                label="Provider"
                value={log.provider ?? "Unknown"}
              />
              <LogDetailItem
                label="Duration"
                value={formatDuration(log.durationMs)}
              />
              <LogDetailItem
                label="Duplicate"
                value={log.duplicate ? "Yes" : "No"}
              />
              <LogDetailItem
                label="Event id"
                value={log.eventId ?? "Not provided"}
              />
              <LogDetailItem
                label="Transaction id"
                value={log.transactionId ?? "Not created"}
              />
              <LogDetailItem
                label="Error reason"
                value={log.errorReason ?? "None"}
              />
              <LogDetailItem
                label="User agent"
                value={log.userAgent ?? "Unknown"}
              />
              <LogDetailItem
                label="IP address"
                value={log.ipAddress ?? "Unknown"}
              />
            </div>

            <Separator />

            <LogDetailBlock
              label="Response message"
              value={log.responseMessage}
            />
            <LogDetailBlock
              label="Request body"
              value={formatRequestPayload(log.requestBody)}
              mono
            />
            <LogDetailBlock
              label="Response body"
              value={formatRequestPayload(log.responseBody)}
              mono
            />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function LogDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-foreground">{value}</p>
    </div>
  );
}

function LogDetailBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <pre
        className={`overflow-x-auto rounded-lg border border-border/50 bg-muted/20 p-3 text-sm whitespace-pre-wrap break-words ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </pre>
    </div>
  );
}
