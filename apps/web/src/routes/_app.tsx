import { AuthProvider } from "@/features/auth/auth.provider";
import { OfflineBanner } from "@/components/custom/offline-banner";
import { getSession } from "@/features/auth/auth.utils";
import { MobileNav } from "@/components/custom/mobile-nav";
import { DesktopSidebar } from "@/features/sidebar/desktop-sidebar";
import { getSidebarCollapsedPreference } from "@/features/sidebar/sidebar-preferences.queries";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { FeatureFlagsProvider } from "@/features/feature-flags/feature-flags.provider";
import { featureFlagController } from "@/features/feature-flags/feature-flags.controller";
import { themesController } from "@/features/themes/themes.controller";

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

    const [, theme] = await themesController.getTheme();

    return {
      user: session.user,
      sidebarCollapsed: await getSidebarCollapsedPreference(),
      featureFlags: await featureFlagController.getFeatureFlags(),
      theme,
    };
  },
  validateSearch: zodValidator(appSearchSchema),
  component: AppLayout,
});

function AppLayout() {
  const { sidebarCollapsed, featureFlags } = Route.useRouteContext();

  return (
    <AuthProvider>
      <FeatureFlagsProvider featureFlags={featureFlags}>
        <OfflineBanner />
        <div className="min-h-screen bg-background">
          {/* Desktop: sidebar + content */}
          <div className="hidden md:flex">
            <DesktopSidebar defaultCollapsed={sidebarCollapsed} />
            <main className="flex-1 min-w-0">
              <div className="px-6 py-8">
                <Outlet />
              </div>
            </main>
          </div>

          {/* Mobile: content + bottom nav */}
          <div className="md:hidden flex flex-col min-h-screen">
            <main className="flex-1 px-4 pt-6 pb-28">
              <Outlet />
            </main>
            <MobileNav />
          </div>
        </div>
      </FeatureFlagsProvider>
    </AuthProvider>
  );
}
