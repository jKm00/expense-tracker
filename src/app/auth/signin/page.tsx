"use client";

import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const handleGitHubSignIn = () => {
    signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden bg-background px-6">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full opacity-[0.06] blur-[120px]"
        style={{ background: "var(--accent)" }}
      />

      <div className="mx-auto w-full max-w-sm">
        {/* Logo + Title */}
        <div className="mb-10">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-card-border bg-card">
            <svg
              className="h-7 w-7 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Expense Tracker
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Simple, private expense tracking
          </p>
        </div>

        {/* Sign in */}
        <button
          onClick={handleGitHubSignIn}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-foreground text-sm font-semibold text-background transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        <p className="mt-3 text-xs text-muted/50">
          Secure authentication via GitHub
        </p>
      </div>
    </div>
  );
}
