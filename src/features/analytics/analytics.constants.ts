export const TOP_LIMIT = 5;

export const currencyFormatter = new Intl.NumberFormat("no-NB", {
  style: "currency",
  currency: "NOK",
});

export const currencyFormatterNoDecimals = new Intl.NumberFormat("no-NB", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});
