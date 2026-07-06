/** Nomba balance endpoints return NGN as a decimal string (e.g. `"281946.50"`). */
export function nombaNgnStringToKobo(amount: string): number {
  const naira = Number.parseFloat(amount);
  if (!Number.isFinite(naira) || naira < 0) {
    throw new Error(`Invalid Nomba balance amount: ${amount}`);
  }
  return Math.round(naira * 100);
}
