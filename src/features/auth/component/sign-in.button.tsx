import { authClient } from "../auth-client";

export function SignInButton({ redirect }: { redirect?: string }) {
  return (
    <button
      onClick={async () => {
        await authClient.signIn.social({
          provider: "github",
          callbackURL: redirect || "/dashboard",
        });
      }}
    >
      Sign in with GitHub
    </button>
  );
}
