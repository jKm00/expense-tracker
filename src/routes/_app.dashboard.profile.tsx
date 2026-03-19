import { useAuth } from "@/features/auth/auth.provider";
import { SignOutButton } from "@/features/auth/component/sign-out.button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();

  return (
    <div>
      {user && user.image && <img src={user?.image} className="size-10" />}
      <p>{user?.name}</p>
      <SignOutButton />
    </div>
  );
}
