import {
  ExpectedError,
  ExpectedErrorMessage,
  ExpectedErrorTitle,
} from "@/components/custom/errors/expected-error";
import { UnexpectedError } from "@/components/custom/errors/unexpected-error";
import {
  PageHeader,
  PageHeaderActions,
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
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createIntegrationTokenSchema,
  type CreateIntegrationTokenDTO,
} from "@/features/integrations/integration.dtos";
import { integrationMutations } from "@/features/integrations/integration.mutations";
import { integrationQueries } from "@/features/integrations/integration.queries";
import type {
  IntegrationRequestLogListItem,
  IntegrationTokenMetadata,
} from "@/features/integrations/integration.models";
import { env } from "@/config/env";
import { useInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  Copy,
  History,
  Info,
  KeyRound,
  LoaderCircle,
  TerminalSquare,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type HowItWorksTab = "overview" | "example" | "api";
type TokenExampleTab = "curl" | "javascript" | "python";

const integrationEndpointPath = "/api/integrations/transactions";
const integrationOriginPlaceholder = "https://ex.edvardsen.dev";

const integrationJsonExample = `{
  "provider": "apple_pay",
  "eventId": "apple-pay-2026-06-01-001",
  "amount": 149.90,
  "date": "2026-06-01T12:30:00+02:00",
  "store": "Joe & The Juice",
  "description": "Apple Pay card tap"
}`;

function getIntegrationEndpointUrl(origin: string | null) {
  const baseUrl = origin?.replace(/\/$/, "") || integrationOriginPlaceholder;
  return `${baseUrl}${integrationEndpointPath}`;
}

function useIntegrationEndpointUrl() {
  const [endpointUrl, setEndpointUrl] = useState(() =>
    getIntegrationEndpointUrl(null),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setEndpointUrl(getIntegrationEndpointUrl(window.location.origin));
  }, []);

  return endpointUrl;
}

function getCurlExample(token: string, endpointUrl: string) {
  return `curl -X POST "${endpointUrl}" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "apple_pay",
    "eventId": "apple-pay-2026-06-01-001",
    "amount": 149.90,
    "date": "2026-06-01T12:30:00+02:00",
    "store": "Joe & The Juice",
    "description": "Apple Pay card tap"
  }'`;
}

function getJsExample(token: string, endpointUrl: string) {
  return `await fetch("${endpointUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${token}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    provider: "apple_pay",
    eventId: "apple-pay-2026-06-01-001",
    amount: 149.90,
    date: "2026-06-01T12:30:00+02:00",
    store: "Joe & The Juice",
    description: "Apple Pay card tap"
  })
});`;
}

function getPythonExample(token: string, endpointUrl: string) {
  return `import requests

response = requests.post(
    "${endpointUrl}",
    headers={
        "Authorization": "Bearer ${token}",
        "Content-Type": "application/json",
    },
    json={
        "provider": "apple_pay",
        "eventId": "apple-pay-2026-06-01-001",
        "amount": 149.90,
        "date": "2026-06-01T12:30:00+02:00",
        "store": "Joe & The Juice",
        "description": "Apple Pay card tap",
    },
)

print(response.status_code)
print(response.text)`;
}

export const Route = createFileRoute("/_app/dashboard/integrations")({
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      integrationQueries.getIntegrationTokensOptions(),
    );
    await context.queryClient.prefetchInfiniteQuery(
      integrationQueries.getIntegrationRequestLogsOptions(null),
    );

    const showBetaBadge =
      env.INTEGRATION_BETA_BADGE.trim().toLowerCase() !== "false";

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
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const {
    data: [expectedError, tokens],
    error: unexpectedError,
  } = useSuspenseQuery(integrationQueries.getIntegrationTokensOptions());

  if (unexpectedError) {
    return <UnexpectedError />;
  }

  if (expectedError) {
    return (
      <ExpectedError>
        <ExpectedErrorTitle>Integrations unavailable</ExpectedErrorTitle>
        <ExpectedErrorMessage>{expectedError.message}</ExpectedErrorMessage>
      </ExpectedError>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderTitle>
          <span className="inline-flex items-center gap-2">
            Integrations
            {showBetaBadge ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
                BETA
              </Badge>
            ) : null}
          </span>
        </PageHeaderTitle>
        <PageHeaderDescription>
          Create a token to let trusted automations and apps send transactions
          into your account.
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setHowItWorksOpen(true)}
          >
            <Info className="size-4" />
            How it works
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <CreateTokenCard />

      <TokenListCard tokens={tokens} />

      <IntegrationLogsCard tokens={tokens} />

      <HowItWorksSheet open={howItWorksOpen} onOpenChange={setHowItWorksOpen} />
    </div>
  );
}

function HowItWorksSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<HowItWorksTab>("overview");
  const endpointUrl = useIntegrationEndpointUrl();

  useEffect(() => {
    if (!open) {
      setActiveTab("overview");
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:w-[100vw] data-[side=right]:sm:w-[85vw] data-[side=right]:sm:max-w-[880px]"
      >
        <SheetHeader>
          <SheetTitle>How integrations work</SheetTitle>
          <SheetDescription>
            Learn how to connect trusted automations and apps to create
            transactions securely.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          <div className="flex flex-wrap gap-2 border-b border-border/60 pb-4">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </TabButton>
            <TabButton
              active={activeTab === "example"}
              onClick={() => setActiveTab("example")}
            >
              Example
            </TabButton>
            <TabButton
              active={activeTab === "api"}
              onClick={() => setActiveTab("api")}
            >
              API
            </TabButton>
          </div>

          <div className="mt-6 max-h-[calc(100vh-180px)] space-y-6 overflow-y-auto pr-1 max-md:pb-10">
            {activeTab === "overview" ? <OverviewTabContent /> : null}
            {activeTab === "example" ? <ExampleTabContent /> : null}
            {activeTab === "api" ? <ApiTabContent endpointUrl={endpointUrl} /> : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function OverviewTabContent() {
  return (
    <div className="space-y-6">
      <InfoSection
        title="What this does"
        description="Integrations let other tools send transactions into Expense Tracker using a secure token you generate on this page."
      />

      <InfoSection
        title="How it works"
        description="Use this feature when you have a trusted app, script, or phone automation that can collect payment details and send them to Expense Tracker. For the exact endpoint, headers, and request body, see the API tab."
      >
        <StepList
          steps={[
            "Create a token on this page.",
            "Configure your automation or app to send a request to the integrations API using that token.",
            "Expense Tracker creates the transaction automatically and marks it for review.",
          ]}
        />
      </InfoSection>

      <InfoSection
        title="What happens after sending"
        description="A successful request creates a transaction in your account with the values you sent. Duplicate events can be detected so the same transaction is not created twice."
      />

      <InfoSection
        title="Tips and troubleshooting"
        description="If a request fails, start by checking the logs on this page. They show request details, response codes, and error messages that can help you verify your token, payload, and endpoint configuration."
      />
    </div>
  );
}

function ExampleTabContent() {
  return (
    <div className="space-y-6">
      <InfoSection
        title="Concrete example"
        description="You can create an iPhone automation that runs after a card tap. The automation can extract the merchant, amount, and timestamp from the payment notification, then send that data to Expense Tracker to automatically create a transaction. For the exact API path, headers, and body format, see the API tab."
      />

      <InfoSection title="Suggested setup">
        <StepList
          steps={[
            "Create an integration token on this page and save it in your automation.",
            "Create an iPhone automation that runs when an Apple Pay card tap is detected or when a payment notification is received.",
            "Extract values such as merchant, amount, and timestamp from the automation input.",
            "Send those values to Expense Tracker using the integrations endpoint and your token.",
            "Review the created transaction later to add products, tags, or other details.",
          ]}
        />
      </InfoSection>

      <InfoSection title="Values your automation can send">
        <KeyValueList
          items={[
            ["Merchant", "Saved as the transaction store name when provided."],
            ["Amount", "Used as the transaction amount."],
            ["Date or timestamp", "Used as the transaction date and time."],
            ["Optional note", "Can be sent as the description."],
          ]}
        />
      </InfoSection>
    </div>
  );
}

function ApiTabContent({ endpointUrl }: { endpointUrl: string }) {
  return (
    <div className="space-y-6">
      <InfoSection title="Endpoint">
        <CodeBlock value={`POST ${integrationEndpointPath}`} />
      </InfoSection>

      <InfoSection
        title="Authentication"
        description="Every request must include a bearer token that you generate on this page. Tokens are shown only once when created, so store them safely."
      >
        <CodeBlock value={`Authorization: Bearer <your-token>`} />
      </InfoSection>

      <InfoSection title="Required fields">
        <KeyValueList
          items={[
            ["provider", "The integration source. Currently `apple_pay`."],
            [
              "eventId",
              "A unique identifier for the event so duplicates can be detected. If you do not have a natural event id, you can include a timestamp as part of the identifier.",
            ],
            ["amount", "A positive number for the transaction amount."],
            ["date", "An ISO datetime string including timezone offset."],
          ]}
        />
      </InfoSection>

      <InfoSection title="Optional fields">
        <KeyValueList
          items={[
            ["store", "Merchant or store name."],
            ["description", "Optional note or fallback description."],
          ]}
        />
      </InfoSection>

      <InfoSection title="JSON example">
        <CodeBlock value={integrationJsonExample} language="json" />
      </InfoSection>

      <InfoSection title="curl example">
        <CodeBlock
          value={getCurlExample("<your-token>", endpointUrl)}
          language="bash"
          copyable
        />
      </InfoSection>
    </div>
  );
}

function InfoSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, index) => (
        <li
          key={step}
          className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {index + 1}
          </span>
          <span className="text-sm text-foreground">{step}</span>
        </li>
      ))}
    </ol>
  );
}

function KeyValueList({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-lg border border-border/50 bg-muted/20 p-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-sm text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({
  value,
  language,
  copyable = false,
}: {
  value: string;
  language?: string;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {}
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {language ?? "text"}
        </span>
        {copyable ? (
          <Button type="button" variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        ) : null}
      </div>
      <pre className="overflow-x-auto p-3 text-xs whitespace-pre-wrap break-words font-mono text-foreground">
        {value}
      </pre>
    </div>
  );
}

function CreateTokenCard() {
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const createToken = integrationMutations.createIntegrationToken();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateIntegrationTokenDTO>({
    resolver: zodResolver(createIntegrationTokenSchema),
    defaultValues: { name: "" },
  });

  const onSubmit = handleSubmit((data) => {
    createToken.mutate(data, {
      onSuccess: ([error, result]) => {
        if (error) {
          const reason = error.reason;
          const message =
            reason === "INTEGRATION_TOKEN_LIMIT_REACHED"
              ? "You already have 10 active tokens. Revoke one before creating another."
              : "Failed to create token. Please try again.";
          toast.error(message);
          return;
        }

        setRevealedToken(result.token);
        setExamplesOpen(false);
        setTokenCopied(false);
        reset({ name: "" });
        toast.success("Token created. Copy it now - it is shown only once.");
      },
    });
  });

  useEffect(() => {
    if (!tokenCopied) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setTokenCopied(false);
    }, 2000);

    return () => window.clearTimeout(timeout);
  }, [tokenCopied]);

  async function handleCopyToken() {
    if (!revealedToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(revealedToken);
      setTokenCopied(true);
    } catch {}
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create API token</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="integration-token-name">Token name</Label>
            <Input
              id="integration-token-name"
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
                {tokenCopied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {tokenCopied ? "Copied" : "Copy token"}
              </Button>
            </div>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">
                Keep this token safe. You will use it in the authorization step
                below.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setExamplesOpen(true)}
                >
                  <TerminalSquare className="size-4" />
                  View code examples
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>

      <TokenExamplesSheet
        open={examplesOpen}
        onOpenChange={setExamplesOpen}
        token={revealedToken}
      />
    </Card>
  );
}

function TokenExamplesSheet({
  open,
  onOpenChange,
  token,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
}) {
  const [activeTab, setActiveTab] = useState<TokenExampleTab>("curl");
  const endpointUrl = useIntegrationEndpointUrl();

  useEffect(() => {
    if (!open) {
      setActiveTab("curl");
    }
  }, [open]);

  if (!token) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 data-[side=right]:w-[100vw] data-[side=right]:sm:w-[85vw] data-[side=right]:sm:max-w-[880px]"
      >
        <SheetHeader className="pr-12">
          <SheetTitle>Use this token</SheetTitle>
          <SheetDescription>
            These examples are ready to test with the token you just created.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6">
          <div className="flex flex-wrap gap-2 border-b border-border/60 pb-4">
            <TabButton
              active={activeTab === "curl"}
              onClick={() => setActiveTab("curl")}
            >
              curl
            </TabButton>
            <TabButton
              active={activeTab === "javascript"}
              onClick={() => setActiveTab("javascript")}
            >
              JS
            </TabButton>
            <TabButton
              active={activeTab === "python"}
              onClick={() => setActiveTab("python")}
            >
              Python
            </TabButton>
          </div>

          <div className="mt-6 flex-1 overflow-y-auto pr-1">
            {activeTab === "curl" ? (
              <InfoSection
                title="curl example"
                description="Use this to quickly test the integrations endpoint from your terminal."
              >
                <CodeBlock
                  value={getCurlExample(token, endpointUrl)}
                  language="bash"
                  copyable
                />
              </InfoSection>
            ) : null}

            {activeTab === "javascript" ? (
              <InfoSection
                title="JavaScript example"
                description="Use this in a script, automation step, or app that can call fetch."
              >
                <CodeBlock
                  value={getJsExample(token, endpointUrl)}
                  language="javascript"
                  copyable
                />
              </InfoSection>
            ) : null}

            {activeTab === "python" ? (
              <InfoSection
                title="Python example"
                description="Use this from a script or backend job with the requests library."
              >
                <CodeBlock
                  value={getPythonExample(token, endpointUrl)}
                  language="python"
                  copyable
                />
              </InfoSection>
            ) : null}
          </div>
        </div>

        <SheetFooter className="border-t bg-muted/30">
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TokenListCard({ tokens }: { tokens: IntegrationTokenMetadata[] }) {
  const revokeToken = integrationMutations.revokeIntegrationToken();
  const [selectedToken, setSelectedToken] =
    useState<IntegrationTokenMetadata | null>(null);
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
    <>
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
                Create a token above to enable Apple Pay integration imports.
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
                  onOpen={() => setSelectedToken(token)}
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
                    onOpen={() => setSelectedToken(token)}
                  />
                ))}
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <TokenDetailsSheet
        token={selectedToken}
        open={selectedToken !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedToken(null);
          }
        }}
      />
    </>
  );
}

function ActiveTokenRow({
  token,
  isLast,
  isRevoking,
  onOpen,
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
  onOpen: () => void;
  onRevoke: (tokenId: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${isLast ? "" : "border-b border-border/40"}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {token.name}
          </p>
          <Badge variant="secondary">
            <ShieldCheck className="size-3" />
            Active
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Prefix: <span className="font-mono">{token.tokenPrefix}</span>
        </p>
      </button>
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
  onOpen,
}: {
  token: {
    id: string;
    name: string;
    tokenPrefix: string;
    createdAt: Date;
    revokedAt: Date | null;
  };
  isLast: boolean;
  onOpen: () => void;
}) {
  return (
    <div className={`px-4 py-3 ${isLast ? "" : "border-b border-border/40"}`}>
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {token.name}
          </p>
          <Badge variant="outline">
            <ShieldX className="size-3" />
            Revoked
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Prefix: <span className="font-mono">{token.tokenPrefix}</span>
        </p>
      </button>
    </div>
  );
}

function TokenDetailsSheet({
  token,
  open,
  onOpenChange,
}: {
  token: IntegrationTokenMetadata | null;
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
          <SheetTitle>Token details</SheetTitle>
          <SheetDescription>
            Token metadata and lifecycle information.
          </SheetDescription>
        </SheetHeader>

        {token ? (
          <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <LogDetailItem label="Name" value={token.name} />
              <LogDetailItem
                label="Status"
                value={token.revokedAt ? "Revoked" : "Active"}
              />
              <LogDetailItem label="Prefix" value={token.tokenPrefix} />
              <LogDetailItem
                label="Created at"
                value={formatDateTime(token.createdAt)}
              />
              <LogDetailItem
                label="Updated at"
                value={formatDateTime(token.updatedAt)}
              />
              <LogDetailItem
                label="Last used"
                value={formatDateTime(token.lastUsedAt)}
              />
              <LogDetailItem
                label="Revoked at"
                value={formatDateTime(token.revokedAt)}
              />
              <LogDetailItem label="Token id" value={token.id} />
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function IntegrationLogsCard({
  tokens,
}: {
  tokens: IntegrationTokenMetadata[];
}) {
  const [selectedTokenId, setSelectedTokenId] = useState<string>("all");
  const [selectedLog, setSelectedLog] =
    useState<IntegrationRequestLogListItem | null>(null);
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
    integrationQueries.getIntegrationRequestLogsOptions(selectedFilterTokenId),
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
              Integration logs
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Recent integration requests with request and response details.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <Label htmlFor="integration-log-token-filter" className="text-xs">
              Filter by token
            </Label>
            <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
              <SelectTrigger
                id="integration-log-token-filter"
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
              Loading integration logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
              <p className="text-sm font-medium text-foreground">
                No logs found
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedFilterTokenId
                  ? "No requests have been logged for the selected token yet."
                  : "Integration requests will appear here once imports start coming in."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              {logs.map((log, index) => (
                <IntegrationLogRow
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

      <IntegrationLogDetailsSheet
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

function IntegrationLogRow({
  log,
  isLast,
  onClick,
}: {
  log: IntegrationRequestLogListItem;
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

function IntegrationLogDetailsSheet({
  log,
  open,
  onOpenChange,
}: {
  log: IntegrationRequestLogListItem | null;
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
          <SheetTitle>Integration request details</SheetTitle>
          <SheetDescription>
            Detailed request and response metadata for this integration log
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
