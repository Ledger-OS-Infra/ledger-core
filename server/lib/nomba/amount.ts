/** Nomba balance endpoints return NGN as a decimal string (e.g. `"281946.50"`). */
export function nombaNgnStringToKobo(amount: string): number {
  const naira = Number.parseFloat(amount);
  if (!Number.isFinite(naira) || naira < 0) {
    throw new Error(`Invalid Nomba balance amount: ${amount}`);
  }
  return Math.round(naira * 100);
}

/**
 * Nomba webhook `transactionAmount` is in NGN (whole/decimal), while Ledger stores kobo.
 * Convert once at ingest so reconciliation and reporting stay consistent.
 */
export function nombaWebhookAmountToKobo(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid Nomba webhook transactionAmount: ${amount}`);
  }
  return Math.round(amount * 100);
}
