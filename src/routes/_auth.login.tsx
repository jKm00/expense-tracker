import { SignInButton } from "@/features/auth/component/sign-in.button";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { createFileRoute } from "@tanstack/react-router";

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/_auth/login")({
  validateSearch: zodValidator(loginSearchSchema),
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();

  return (
    <div>
      <SignInButton redirect={redirect} />
    </div>
  );
}
