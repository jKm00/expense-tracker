import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

/**
 * Registers the service worker and shows a Sonner toast when a new version
 * is available. The toast stays until the user clicks "Reload" or dismisses it.
 *
 * This component renders nothing visible — it only manages the SW lifecycle
 * and triggers toasts as side effects.
 */
export function ReloadPrompt() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("SW registered:", swUrl);

      // Check for updates every hour
      if (registration) {
        intervalRef.current = setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000,
        );
      }
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });

  // Clean up the polling interval when the component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      toast("App update available", {
        description: "A new version is ready. Reload to update.",
        duration: Infinity,
        action: {
          label: "Reload",
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
