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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createAutomationTokenSchema,
  type CreateAutomationTokenDTO,
} from "@/features/automation/automation.dtos";
import { automationMutations } from "@/features/automation/automation.mutations";
import { automationQueries } from "@/features/automation/automation.queries";
import { env } from "@/config/env";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  Copy,
  KeyRound,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard/automations")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      automationQueries.getAutomationTokensOptions(),
    );

    const showBetaBadge = env.AUTOMATION_BETA_BADGE.trim().toLowerCase() !== "false";

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
        <ExpectedErrorMessage>
          {expectedError.message}
        </ExpectedErrorMessage>
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

      <ApplePayInstructionsCard />
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
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              Copy this token now. You will not be able to see it again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Input readOnly value={revealedToken} className="font-mono text-xs" />
              <Button type="button" size="icon" variant="outline" onClick={handleCopyToken}>
                <Copy className="size-4" />
                <span className="sr-only">Copy token</span>
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TokenListCard({
  tokens,
}: {
  tokens: Array<{
    id: string;
    name: string;
    tokenPrefix: string;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
  }>;
}) {
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
            <p className="text-sm font-medium text-foreground">No active tokens</p>
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
          Prefix: <span className="font-mono">{token.tokenPrefix}</span> - Created{" "}
          {formatDateTime(token.createdAt)} - Last used {formatDateTime(token.lastUsedAt)}
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
        {formatDateTime(token.createdAt)} - Revoked {formatDateTime(token.revokedAt)}
      </p>
    </div>
  );
}

function ApplePayInstructionsCard() {
  const samplePayload = JSON.stringify(
    {
      provider: "apple_pay",
      eventId: "apple-pay-evt-123456",
      amount: 129.9,
      date: "2026-05-21T14:37:12+02:00",
      store: "Apple Store",
      description: "Order #A1234",
    },
    null,
    2,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apple Pay setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Create an automation token above and copy it immediately.</li>
          <li>
            Configure your automation tool to send a <code>POST</code> request to
            <code> /api/automation/import</code>.
          </li>
          <li>
            Add header <code>Authorization: Bearer &lt;your-token&gt;</code>.
          </li>
          <li>
            Send this JSON body:
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs text-foreground">
              <code>{samplePayload}</code>
            </pre>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
