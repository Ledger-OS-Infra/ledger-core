export const OBLIGATION_TYPES = [
  "INVOICE",
  "SUBSCRIPTION",
  "FEE",
  "LEVY",
  "CUSTOM",
] as const;

export type ObligationType = (typeof OBLIGATION_TYPES)[number];

export const OBLIGATION_STATUSES = [
  "UNPAID",
  "PARTIAL",
  "PAID",
  "OVERDUE",
] as const;

export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

export function outstandingBalance(amount: number, amountPaid: number): number {
  return Math.max(amount - amountPaid, 0);
}

/**
 * Derives display status from stored payment progress and due date.
 * Reconciliation updates amount_paid; status in DB may lag until reconciliation runs.
 */
export function deriveObligationStatus(
  amount: number,
  amountPaid: number,
  dueDate: string,
  referenceDate: Date = new Date(),
): ObligationStatus {
  if (amountPaid >= amount) {
    return "PAID";
  }

  if (amountPaid > 0) {
    return "PARTIAL";
  }

  const due = new Date(`${dueDate}T00:00:00.000Z`);
  const today = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    ),
  );

  if (due < today) {
    return "OVERDUE";
  }

  return "UNPAID";
}
