import { AuthProvider } from "@/features/auth/auth.provider";
import { OfflineBanner } from "@/components/custom/offline-banner";
import { getSession } from "@/features/auth/auth.utils";
import { MobileNav } from "@/components/custom/mobile-nav";
import { DesktopSidebar } from "@/components/custom/desktop-sidebar";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";

const appSearchSchema = z.object({
  month: z.number().optional(),
  year: z.number().optional(),
});

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
  validateSearch: zodValidator(appSearchSchema),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AuthProvider>
      <OfflineBanner />
      <div className="min-h-screen bg-background">
        {/* Desktop: sidebar + content */}
        <div className="hidden md:flex">
          <DesktopSidebar />
          <main className="flex-1 p-6">
            <div className="mx-auto">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Mobile: content + bottom nav */}
        <div className="md:hidden flex flex-col min-h-screen">
          <main className="flex-1 p-4 pb-26">
            <Outlet />
          </main>
          <MobileNav />
        </div>
      </div>
    </AuthProvider>
  );
}
