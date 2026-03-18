import { authClient } from "@/features/auth/auth.client";
import { useNavigate } from "@tanstack/react-router";

export function SignOutButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={async () =>
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              navigate({
                to: "/",
              });
            },
          },
        })
      }
    >
      Sign out
    </button>
  );
}
