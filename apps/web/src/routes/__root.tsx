import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import TanStackQueryDevtools from "@/lib/tanstack-query/devtools";

import "../styles.css";

import type { QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider, ThemeScript } from "@/features/themes";
import {
  isThemeMode,
  isThemePaletteId,
  type ThemePreference,
} from "@/features/themes";

interface MyRouterContext {
  queryClient: QueryClient;
}

function getServerTheme(
  matches: { context?: unknown }[],
): ThemePreference | null {
  for (const match of matches) {
    const context = match.context;
    if (!context || typeof context !== "object") continue;

    const theme = (context as { theme?: ThemePreference | null }).theme;
    if (
      theme &&
      isThemePaletteId(theme.palette) &&
      isThemeMode(theme.mode)
    ) {
      return theme;
    }
  }

  return null;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: ({ matches }) => {
    const initialTheme = getServerTheme(matches as { context?: unknown }[]);

    return {
      meta: [
        {
          charSet: "utf-8",
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },
        {
          title: "Expenses v2",
        },
        {
          name: "theme-color",
          content: "#0a0a0a",
        },
        {
          name: "apple-mobile-web-app-capable",
          content: "yes",
        },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
      ],
      links: [
        {
          rel: "icon",
          href: "/favicon.svg",
          type: "image/svg+xml",
        },
        {
          rel: "manifest",
          href: "/manifest.json",
        },
        {
          rel: "apple-touch-icon",
          href: "/icons/apple-touch-icon.png",
        },
      ],
      scripts: initialTheme
        ? [
            {
              children: `window.__INITIAL_THEME__=${JSON.stringify(initialTheme)};`,
            },
          ]
        : undefined,
    };
  },

  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const serverTheme = useRouterState({
    select: (state) => getServerTheme(state.matches as { context?: unknown }[]),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <ThemeScript />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider
          serverTheme={serverTheme}
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
