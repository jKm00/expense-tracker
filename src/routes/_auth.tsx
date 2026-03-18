import { getSession } from "@/features/auth/lib/auth.utils";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async () => {
    const session = await getSession();

    if (session) {
      throw redirect({
        to: "/dashboard",
      });
    }
  },
  component: () => <Outlet />,
});
