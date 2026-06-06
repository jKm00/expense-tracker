import { createContext, useContext } from "react";
import { FeatureFlagsDTO } from "./feature-flags.service";

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

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error(
      "useFeatureFlags must be used within an FeatureFlagsProvider",
    );
  }
  return context;
}
