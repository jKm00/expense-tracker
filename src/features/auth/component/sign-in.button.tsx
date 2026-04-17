import { useState } from "react";
import { LoaderButton } from "@/components/custom/loader.button";
import { authClient } from "../auth-client";

export function SignInButton({ redirect }: { redirect?: string }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoaderButton
      isLoading={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          await authClient.signIn.social({
            provider: "github",
            callbackURL: redirect || "/dashboard",
          });
        } finally {
          setIsLoading(false);
        }
      }}
    >
      Sign in with GitHub
    </LoaderButton>
  );
}
