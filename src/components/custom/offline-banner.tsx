import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="alert"
      className="bg-yellow-600 text-white text-center text-sm py-1.5 px-4"
    >
      You're offline — viewing cached data. Some features may not work.
    </div>
  );
}
