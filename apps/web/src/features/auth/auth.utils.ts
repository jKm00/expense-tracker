import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/features/auth";
import { redirect } from "@tanstack/react-router";
import { env } from "@/config/env";

const getAdmins = () => env.ADMINS.split(",").map((e) => e.trim());

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    return session;
  },
);

export const authenticated = createMiddleware().server(
  async ({ next, request }) => {
    const session = await getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: new URL(request.url).pathname,
        },
      });
    }

    return next({
      context: {
        user: session.user,
        session: session.session,
      },
    });
  },
);

export const adminAuthenticated = createMiddleware()
  .middleware([authenticated])
  .server(async ({ next, context }) => {
    const email = context.user.email;
    if (!getAdmins().includes(email)) {
      throw redirect({
        to: "/dashboard",
      });
    }

    return next();
  });
