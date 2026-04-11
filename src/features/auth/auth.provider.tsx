import { createContext, useContext } from "react";
import { User } from "./auth.models";
import { authClient } from "./auth-client";
import { Gem } from "lucide-react";

export type AuthContextType = {
  user: User | null;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();

  const value: AuthContextType = {
    user: data
      ? {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          image: data.user.image || null,
        }
      : null,
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 grid place-items-center animate-pulse">
            <Gem className="size-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
