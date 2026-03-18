import { SignOutButton } from "@/features/auth/component/sign-out.button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <p>/_app/dashbaord</p>
      <SignOutButton />
    </div>
  );
}
