"use client";

import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { signOut, useSession } from "@/lib/auth-client";

export default function SettingsPage() {
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/auth/signin";
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <main className="mx-auto max-w-lg px-4 py-6">
        {/* Profile */}
        <Card className="mb-4">
          <CardContent className="flex items-center gap-4 py-4">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-14 w-14 rounded-full"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gray-200" />
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {session?.user?.name || "User"}
              </p>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Button
          onClick={handleSignOut}
          className="flex w-full items-center justify-between py-3 text-left text-red-600"
          variant="outline"
        >
          <span className="font-medium">Sign Out</span>
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
