import { RefObject, useEffect } from "react";

export function useInfiniteScroll({
  targetRef,
  enabled,
  onIntersect,
  rootMargin = "200px",
  refreshKey,
}: {
  targetRef: RefObject<Element | null>;
  enabled: boolean;
  onIntersect: () => void;
  rootMargin?: string;
  refreshKey?: unknown;
}) {
  useEffect(() => {
    const target = targetRef.current;
    if (!target || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          onIntersect();
        }
      },
      { rootMargin },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [enabled, onIntersect, refreshKey, rootMargin, targetRef]);
}
