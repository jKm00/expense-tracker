import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { parseSidebarCollapsedCookie } from "./sidebar-preferences";

export const getSidebarCollapsedPreference = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    return parseSidebarCollapsedCookie(headers.get("cookie"));
  },
);
