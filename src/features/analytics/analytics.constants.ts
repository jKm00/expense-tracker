// src/features/analytics/analytics.constants.ts

/** Norwegian Krone formatter with decimals (used in KPI cards) */
export const currencyFormatter = new Intl.NumberFormat("no-NB", {
  style: "currency",
  currency: "NOK",
});

/** Norwegian Krone formatter without decimals (used in chart axes/tooltips) */
export const currencyFormatterCompact = new Intl.NumberFormat("no-NB", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

/** Maximum items shown in breakdown charts before "Show all" */
export const BREAKDOWN_TOP_LIMIT = 5;
