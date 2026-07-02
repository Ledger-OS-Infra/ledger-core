/** Nomba (and Ledger-Core) store NGN amounts in kobo — 1 NGN = 100 kobo. */
export const KOBO_PER_NGN = 100;
export const MINIMUM_AMOUNT = 1;

function assertWholeInteger(
  amount: number,
  field: string,
  minimum = MINIMUM_AMOUNT,
): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${field} must be a whole number`);
  }

  if (amount < 0) {
    throw new Error(`${field} cannot be negative`);
  }

  if (amount < minimum) {
    throw new Error(`${field} must be at least ${minimum}`);
  }
}

/** Convert whole naira to kobo for storage / Nomba API calls. E.g. ₦1,500 → 150_000. */
export function ngnToKobo(ngn: number): number {
  assertWholeInteger(ngn, "NGN amount");
  return ngn * KOBO_PER_NGN;
}

/** Convert kobo to whole naira for display. E.g. 150_000 kobo → ₦1,500. */
export function koboToNgn(kobo: number): number {
  assertWholeInteger(kobo, "Kobo amount");
  return kobo / KOBO_PER_NGN;
}

/** Nomba webhook `transactionAmount` and API amount fields are kobo integers. */
export function assertKoboAmount(amount: number, field = "amount"): void {
  assertWholeInteger(amount, field, 1);
}
