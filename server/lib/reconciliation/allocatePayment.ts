import type { PoolClient } from "pg";
import type { MatchResult } from "./matchPayment";

export type ObligationStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";

export interface AllocationResult {
  obligationId: string;
  newStatus: ObligationStatus;
  amountApplied: number;
  excessCreditedToWallet: number;
  ledgerEntryId: string | null;
}

export function deriveStatus(
  amountPaid: number,
  totalAmount: number,
): ObligationStatus {
  if (amountPaid >= totalAmount) return "PAID";
  if (amountPaid > 0) return "PARTIAL";
  return "UNPAID";
}

// TODO: This function is called by the BullMQ reconciliation worker in #15.
// The worker receives a payment event, calls matchPayment() to find the
// obligation, then calls allocatePayment() inside a database transaction.
export async function allocatePayment(
  match: MatchResult,
  paymentEventId: string,
  client: PoolClient,
): Promise<AllocationResult> {
  const { obligation, amountToApply, excessAmount } = match;

  const currentAmountPaid = Number(obligation.amount_paid);
  const totalAmount = Number(obligation.amount);
  const newAmountPaid = currentAmountPaid + amountToApply;
  const newStatus = deriveStatus(newAmountPaid, totalAmount);

  // Update the obligation
  await client.query(
    `UPDATE payment_obligations
     SET amount_paid = $1, status = $2, updated_at = NOW()
     WHERE id = $3`,
    [newAmountPaid, newStatus, obligation.id],
  );

  const { rows: ledgerRows } = await client.query<{ id: string }>(
    `INSERT INTO ledger_entries (
       customer_id,
       obligation_id,
       payment_event_id,
       entry_type,
       amount,
       balance_after,
       description
     )
     VALUES ($1, $2, $3, 'CREDIT', $4, $5, $6)
     RETURNING id`,
    [
      obligation.customer_id,
      obligation.id,
      paymentEventId,
      amountToApply,
      newAmountPaid,
      `Payment applied to obligation ${obligation.reference_code ?? obligation.id}`,
    ],
  );

  const ledgerEntryId = ledgerRows[0]?.id ?? null;

  if (excessAmount > 0) {
    await client.query(
      `UPDATE customer_wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE customer_id = $2`,
      [excessAmount, obligation.customer_id],
    );
  }

  return {
    obligationId: obligation.id,
    newStatus,
    amountApplied: amountToApply,
    excessCreditedToWallet: excessAmount,
    ledgerEntryId,
  };
}
