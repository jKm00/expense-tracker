import { getSession } from "@/features/auth/lib/auth.utils";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    return { user: session.user };
  },
  component: () => <Outlet />,
});
