import { SignOutButton } from "@/features/auth/component/sign-out.button";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <p>/_app/dashbaord</p>
      <Link to="/dashboard/items">To items</Link>
      <SignOutButton />
    </div>
  );
}
