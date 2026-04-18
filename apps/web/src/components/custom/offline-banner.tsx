import { useOnlineStatus } from "@/hooks/use-online-status";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-center justify-center gap-2 bg-amber-500/90 text-white text-center text-xs font-medium py-2 px-4"
    >
      <WifiOff className="size-3.5" />
      You're offline — viewing cached data. Some features may not work.
    </div>
  );
}
