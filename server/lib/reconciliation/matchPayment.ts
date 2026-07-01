import type { PaymentObligationRow } from "../../db/obligations";

export interface MatchResult {
  obligation: PaymentObligationRow;
  amountToApply: number;
  excessAmount: number;
  strategy: "exact" | "reference" | "fifo";
}

function getOutstanding(obligation: PaymentObligationRow): number {
  return Number(obligation.amount) - Number(obligation.amount_paid);
}

function buildResult(
  obligation: PaymentObligationRow,
  paymentAmount: number,
  strategy: MatchResult["strategy"],
): MatchResult {
  const outstanding = getOutstanding(obligation);
  const amountToApply = Math.min(paymentAmount, outstanding);
  const excessAmount = Math.max(0, paymentAmount - outstanding);
  return { obligation, amountToApply, excessAmount, strategy };
}

function matchExact(
  paymentAmount: number,
  obligations: PaymentObligationRow[],
): PaymentObligationRow | null {
  const matches = obligations.filter(
    (o) => getOutstanding(o) === paymentAmount,
  );

  if (matches.length === 0) return null;

  // Tiebreaker: oldest first (FIFO)
  return matches.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}

function matchFifo(
  obligations: PaymentObligationRow[],
): PaymentObligationRow | null {
  if (obligations.length === 0) return null;

  return obligations.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}

export function matchPayment(
  paymentAmount: number,
  obligations: PaymentObligationRow[],
  referenceCode?: string | null,
): MatchResult | null {
  // Only match against open obligations
  const open = obligations.filter(
    (o) => o.status === "UNPAID" || o.status === "PARTIAL",
  );

  if (open.length === 0) return null;

  // Step 1: Exact amount match
  const exactMatch = matchExact(paymentAmount, open);
  if (exactMatch) {
    return buildResult(exactMatch, paymentAmount, "exact");
  }

  // Step 2: Reference code match
  // TODO: wire in once Abdullah confirms which field carries
  // the reference code from the webhook payload
  if (referenceCode) {
    const refMatch =
      open.find((o) => o.reference_code === referenceCode) ?? null;
    if (refMatch) {
      return buildResult(refMatch, paymentAmount, "reference");
    }
  }

  // Step 3: FIFO fallback
  const fifoMatch = matchFifo(open);
  if (fifoMatch) {
    return buildResult(fifoMatch, paymentAmount, "fifo");
  }

  return null;
}
