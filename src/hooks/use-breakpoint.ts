import { useEffect, useState } from "react";

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

export function useBreakpoint(breakpoint: number = 768) {
  const [isSmaller, setIsSmaller] = useState(window.innerWidth < breakpoint);

  function handleResize() {
    setIsSmaller(window.innerWidth < breakpoint);
  }

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [breakpoint]);

  return isSmaller;
}
