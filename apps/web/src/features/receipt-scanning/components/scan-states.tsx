import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, FileSearch, Loader2, RefreshCcw, ScanLine, UploadCloud } from "lucide-react";
import type { ComponentType } from "react";

export function ScanLoadingState() {
  return <ScanStageTracker stage="opening" />;
}

export function ScanProgressState({ status }: { status: "upload_pending" | "processing" }) {
  return <ScanStageTracker stage={status === "upload_pending" ? "upload" : "extract"} />;
}

export function ScanPreparingReviewState() {
  return <ScanStageTracker stage="prepare" />;
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

type ScanStage = "opening" | "upload" | "extract" | "prepare";

const SCAN_STAGES: Array<{ id: Exclude<ScanStage, "opening">; label: string; description: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "upload", label: "Upload", description: "Sending the receipt to the scanner.", icon: UploadCloud },
  { id: "extract", label: "Read", description: "Finding store, totals, and lines.", icon: ScanLine },
  { id: "prepare", label: "Prepare", description: "Matching products for review.", icon: CheckCircle2 },
];

function ScanStageTracker({ stage }: { stage: ScanStage }) {
  const activeIndex = stage === "opening" ? 0 : SCAN_STAGES.findIndex((item) => item.id === stage);
  const activeStage = stage === "opening" ? { label: "Opening scan", description: "Fetching the latest scan status.", icon: FileSearch } : SCAN_STAGES[activeIndex];
  const ActiveIcon = activeStage.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ActiveIcon className="size-5" />
            </span>
            <div>
              <p className="font-medium">{activeStage.label}</p>
              <p className="text-sm text-muted-foreground">{activeStage.description}</p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1.5"><Loader2 className="size-3 animate-spin" /> Working</Badge>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {SCAN_STAGES.map((item, index) => {
            const Icon = item.icon;
            const done = stage !== "opening" && index < activeIndex;
            const active = index === activeIndex;
            return (
              <div key={item.id} className={`rounded-xl border p-3 ${active ? "border-primary/40 bg-primary/5" : done ? "bg-emerald-500/5" : "bg-background/70"}`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`flex size-7 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {done ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
                  </span>
                  {item.label}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{done ? "Done" : active ? item.description : "Waiting"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
