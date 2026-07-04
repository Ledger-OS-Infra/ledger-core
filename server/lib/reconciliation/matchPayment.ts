import type { PaymentObligationRow } from "../obligations/format";

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
    (obligation) => getOutstanding(obligation) === paymentAmount,
  );

  if (matches.length === 0) return null;

  return [...matches].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}

function matchFifo(
  obligations: PaymentObligationRow[],
): PaymentObligationRow | null {
  if (obligations.length === 0) return null;

  return [...obligations].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}

export function matchPayment(
  paymentAmount: number,
  obligations: PaymentObligationRow[],
  referenceCode?: string | null,
): MatchResult | null {
  const open = obligations.filter(
    (obligation) =>
      obligation.status === "UNPAID" ||
      obligation.status === "PARTIAL" ||
      obligation.status === "OVERDUE" ||
      getOutstanding(obligation) > 0,
  );

  if (open.length === 0) return null;

  const exactMatch = matchExact(paymentAmount, open);
  if (exactMatch) {
    return buildResult(exactMatch, paymentAmount, "exact");
  }


  if (referenceCode) {
    const refMatch = open.find(
      (obligation) =>
        obligation.reference_code !== null &&
        referenceCode.includes(obligation.reference_code),
    );
    if (refMatch) {
      return buildResult(refMatch, paymentAmount, "reference");
    }
  }

  const fifoMatch = matchFifo(open);
  if (fifoMatch) {
    return buildResult(fifoMatch, paymentAmount, "fifo");
  }

  return null;
}