import type { PoolClient } from "pg";
import type { MatchResult } from "./matchPayment";

export type ObligationStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
export type LedgerEntryType =
  | "PAYMENT_APPLIED"
  | "PARTIAL_PAYMENT"
  | "OVERPAYMENT_CREDIT"
  | "WALLET_APPLIED";

export interface AllocationResult {
  obligationId: string;
  newStatus: ObligationStatus;
  amountApplied: number;
  excessCreditedToWallet: number;
  ledgerEntryId: string | null;
  walletLedgerEntryId: string | null;
}

export function deriveStatus(
  amountPaid: number,
  totalAmount: number,
): ObligationStatus {
  if (amountPaid >= totalAmount) return "PAID";
  if (amountPaid > 0) return "PARTIAL";
  return "UNPAID";
}

function deriveEntryType(
  newStatus: ObligationStatus,
  excessAmount: number,
): LedgerEntryType {
  if (excessAmount > 0) return "OVERPAYMENT_CREDIT";
  if (newStatus === "PAID") return "PAYMENT_APPLIED";
  return "PARTIAL_PAYMENT";
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
  const entryType = deriveEntryType(newStatus, excessAmount);

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
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      obligation.customer_id,
      obligation.id,
      paymentEventId,
      entryType,
      amountToApply,
      newAmountPaid,
      `Payment applied to obligation ${obligation.reference_code ?? obligation.id}`,
    ],
  );

  const ledgerEntryId = ledgerRows[0]?.id ?? null;
  let walletLedgerEntryId: string | null = null;

  if (excessAmount > 0) {
    const { rows: walletRows } = await client.query<{ balance: string }>(
      `UPDATE customer_wallets
       SET balance = balance + $1, updated_at = NOW()
       WHERE customer_id = $2
       RETURNING balance`,
      [excessAmount, obligation.customer_id],
    );

    const newWalletBalance = Number(walletRows[0]?.balance ?? 0);

    const { rows: walletLedgerRows } = await client.query<{ id: string }>(
      `INSERT INTO ledger_entries (
         customer_id,
         obligation_id,
         payment_event_id,
         entry_type,
         amount,
         balance_after,
         description
       )
       VALUES ($1, $2, $3, 'WALLET_APPLIED', $4, $5, $6)
       RETURNING id`,
      [
        obligation.customer_id,
        obligation.id,
        paymentEventId,
        excessAmount,
        newWalletBalance,
        `Excess payment credited to customer wallet`,
      ],
    );

    walletLedgerEntryId = walletLedgerRows[0]?.id ?? null;
  }

  return {
    obligationId: obligation.id,
    newStatus,
    amountApplied: amountToApply,
    excessCreditedToWallet: excessAmount,
    ledgerEntryId,
    walletLedgerEntryId,
  };
}