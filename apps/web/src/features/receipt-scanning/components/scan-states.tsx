import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, FileSearch, Loader2, ReceiptText, RefreshCcw, ScanLine, UploadCloud, WandSparkles } from "lucide-react";
import type { ComponentType } from "react";

export function ScanBetaBadge() {
  return <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">Beta</Badge>;
}

export function ScanLoadingState() {
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

export function ScanProgressState({ status }: { status: "upload_pending" | "processing" }) {
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

export function ScanPreparingReviewState() {
  return (
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
  );
}

export function ScanErrorState({ title, message, onRetry, onBack }: { title: string; message: string; onRetry?: () => void; onBack: () => void }) {
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

export function DailyUsageIndicator({ usage, loading }: { usage?: { used: number; limit: number; remaining: number; resetsAt: string }; loading: boolean }) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-background/60 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    );
  }

  if (!usage) {
    return (
      <div className="rounded-xl border bg-background/60 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Daily scan limit</p>
            <p className="text-xs text-muted-foreground">Usage will appear after the scan API is redeployed.</p>
          </div>
          <Badge variant="outline">5/day</Badge>
        </div>
      </div>
    );
  }

  const percent = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const exhausted = usage.remaining <= 0;
  const almostFull = !exhausted && usage.remaining === 1;
  const resetTime = new Date(usage.resetsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`rounded-xl border p-3 ${exhausted ? "border-destructive/30 bg-destructive/5" : almostFull ? "border-amber-500/30 bg-amber-500/10" : "bg-background/60"}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Daily scan limit</p>
          <p className="text-xs text-muted-foreground">
            {exhausted ? "Limit reached" : `${usage.remaining} ${usage.remaining === 1 ? "scan" : "scans"} left today`} · resets at {resetTime}
          </p>
        </div>
        <Badge variant={exhausted ? "destructive" : almostFull ? "secondary" : "outline"}>{usage.used}/{usage.limit}</Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${exhausted ? "bg-destructive" : almostFull ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
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
