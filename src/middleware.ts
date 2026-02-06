import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Better Auth uses different cookie names based on environment
  // In production with HTTPS, it uses __Secure- prefix
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  // Skip middleware for API routes
  if (isApiRoute) {
    return NextResponse.next();
  }

  // If user is not logged in and trying to access protected routes
  if (!sessionCookie && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // If user is logged in and trying to access auth pages
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
