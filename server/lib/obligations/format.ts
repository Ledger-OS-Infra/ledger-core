import {
  deriveObligationStatus,
  outstandingBalance,
  type ObligationStatus,
  type ObligationType,
} from "./status";

export interface PaymentObligationRow {
  id: string;
  business_id: string;
  customer_id: string;
  billing_rule_id: string | null;
  obligation_type: ObligationType;
  reference_code: string | null;
  amount: string;
  amount_paid: string;
  due_date: string;
  status: ObligationStatus;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ObligationResponse {
  id: string;
  customer_id: string;
  business_id: string;
  billing_rule_id: string | null;
  type: ObligationType;
  reference_code: string | null;
  /** Amounts are kobo integers (1 NGN = 100 kobo). */
  amount: number;
  amount_paid: number;
  outstanding_balance: number;
  due_date: string;
  status: ObligationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

function parseAmount(value: string): number {
  return Number(value);
}

export function formatObligation(row: PaymentObligationRow): ObligationResponse {
  const amount = parseAmount(row.amount);
  const amountPaid = parseAmount(row.amount_paid);

  return {
    id: row.id,
    customer_id: row.customer_id,
    business_id: row.business_id,
    billing_rule_id: row.billing_rule_id,
    type: row.obligation_type,
    reference_code: row.reference_code,
    amount,
    amount_paid: amountPaid,
    outstanding_balance: outstandingBalance(amount, amountPaid),
    due_date: row.due_date,
    status: deriveObligationStatus(amount, amountPaid, row.due_date),
    metadata: row.metadata ?? {},
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function parseStoredAmount(value: string): number {
  return parseAmount(value);
}
