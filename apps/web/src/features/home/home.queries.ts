import { queryOptions } from "@tanstack/react-query";
import { homeController } from "./home.controller";

export const HOME_QUERY_KEY = "home";

function getHomeWidgetsOptions() {
  return queryOptions({
    queryKey: [HOME_QUERY_KEY, "widgets"],
    queryFn: homeController.getHomeWidgets,
  });
}

export const homeQueries = {
  getHomeWidgetsOptions,
};
