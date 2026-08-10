const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats a number (in Naira) as ₦ with thousands separators, e.g. ₦7,600 */
export function formatNaira(amount: number): string {
  // Intl gives us "NGN" or "₦" depending on runtime ICU data; normalize to ₦.
  const formatted = nairaFormatter.format(amount);
  return formatted.replace("NGN", "₦").replace(/^\s+/, "");
}

export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date.toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
  });
}

export function monthLabel(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return date
    .toLocaleDateString("en-NG", { month: "long", year: "numeric" })
    .toUpperCase();
}
