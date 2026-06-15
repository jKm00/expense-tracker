import { createContext } from "react";
import { FeatureFlagsDTO } from "@/features/feature-flags/shared/feature-flags.types";

const FeatureFlagsContext = createContext<FeatureFlagsDTO | null>(null);

export function FeatureFlagsProvider({
  featureFlags,
  children,
}: {
  featureFlags: FeatureFlagsDTO;
  children: React.ReactNode;
}) {
  return (
    <FeatureFlagsContext.Provider value={featureFlags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}
