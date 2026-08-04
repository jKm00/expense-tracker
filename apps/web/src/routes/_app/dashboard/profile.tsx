import { useAuth } from "@/features/auth/auth.provider";
import { authClient } from "@/features/auth/auth-client";
import { ThemePicker } from "@/features/themes";
import { DataPortabilityCard } from "@/features/data-portability/data-portability.card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PageHeaderTitle,
  PageHeaderDescription,
  PageHeaderActions,
} from "@/components/custom/page-header";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOutIcon, Palette } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useAuth();
  const navigate = useNavigate();

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          navigate({ to: "/" });
        },
      },
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader>
        <PageHeaderTitle>Profile</PageHeaderTitle>
        <PageHeaderDescription>
          Manage your account settings
        </PageHeaderDescription>
        <PageHeaderActions>
          <Button variant="outline" onClick={handleSignOut} size="sm">
            <LogOutIcon className="size-4" />
            <span className="sr-only sm:not-sr-only">Sign Out</span>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {/* User Info */}
      <Card>
        <CardContent className="flex items-center gap-4 py-2">
          <Avatar className="size-12 ring-2 ring-border">
            {user?.image && (
              <AvatarImage src={user.image} alt={user.name ?? "User"} />
            )}
            <AvatarFallback className="text-sm font-semibold">
              {user?.name ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-base font-semibold truncate">
              {user?.name ?? "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-3">
            <div className="size-8 rounded-lg bg-muted grid place-items-center">
              <Palette className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Choose a palette and light or dark mode
              </p>
            </div>
          </div>
          <ThemePicker />
        </CardContent>
      </Card>

      <DataPortabilityCard />
    </div>
  );
}
