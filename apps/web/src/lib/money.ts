export type DisplayCurrency = "MYR" | "AUD";

/** Display label for an amount. Not for calculation; see `@hrms/domain` money. */
export function formatMoney(amount: number, currency: DisplayCurrency): string {
  // Same grouping the Malaysian screens already used: 1,234.50
  const fixed = Number(amount).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "AUD" ? `A$${fixed}` : `RM ${fixed}`;
}

export type OrganizationDisplay = {
  country: "MY" | "AU";
  currency: DisplayCurrency;
};

/** Currency code for display. Unknown values mean MYR. */
export function currencyOrDefault(value: string | null | undefined): DisplayCurrency {
  return value === "AUD" ? "AUD" : "MYR";
}

/** Prefix used inside sentences: "RM " or "A$". */
export function currencyPrefix(currency: DisplayCurrency): string {
  return currency === "AUD" ? "A$" : "RM ";
}

/** Short currency label for column and field captions: "RM" or "A$". */
export function currencySymbolLabel(currency: DisplayCurrency): string {
  return currency === "AUD" ? "A$" : "RM";
}
