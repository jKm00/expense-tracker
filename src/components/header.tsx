"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";

export function Header() {
  const pathname = usePathname();
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
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <nav className="flex gap-1">
          <Link
            href="/"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            Home
          </Link>
          <Link
            href="/analytics"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/analytics"
                ? "bg-gray-100 text-gray-900"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            Analytics
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {session?.user?.image && (
            <img
              src={session.user.image}
              alt=""
              className="h-7 w-7 rounded-full"
            />
          )}
          <button
            onClick={handleSignOut}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
