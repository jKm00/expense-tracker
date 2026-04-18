import { useState } from "react";
import { LoaderButton } from "@/components/custom/loader.button";
import { authClient } from "@/features/auth/auth-client";
import { useNavigate } from "@tanstack/react-router";

export function SignOutButton() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <LoaderButton
      isLoading={isLoading}
      onClick={async () => {
        setIsLoading(true);
        try {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                navigate({ to: "/" });
              },
            },
          });
        } finally {
          setIsLoading(false);
        }
      }}
    >
      Sign out
    </LoaderButton>
  );
}
