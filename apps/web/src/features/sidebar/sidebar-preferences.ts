export const SIDEBAR_COLLAPSED_COOKIE = "expense-tracker-sidebar-collapsed";

export function parseSidebarCollapsedCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return false;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .some((part) => part === `${SIDEBAR_COLLAPSED_COOKIE}=1`);
}

export function writeSidebarCollapsedCookie(collapsed: boolean) {
  if (typeof document === "undefined") return;

  document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
}
