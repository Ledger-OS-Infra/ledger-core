import type {
  AgingSummaryRow,
  BusinessMetricsRow,
  CustomerBalanceRow,
  CustomerLedgerHistoryRow,
  ObligationAgingRow,
  ObligationDetailRow,
  ObligationPaymentHistoryRow,
} from "../../db/reporting";

function amount(value: string | number): number {
  return Number(value);
}

function isoDate(value: string | Date | null): string | null {
  if (value === null) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

export function formatBusinessMetrics(row: BusinessMetricsRow) {
  return {
    business_id: row.business_id,
    business_name: row.business_name,
    total_inflow: amount(row.total_inflow),
    total_outstanding: amount(row.total_outstanding),
    overdue_obligation_count: row.overdue_obligation_count,
    overdue_amount: amount(row.overdue_amount),
    total_wallet_credit: amount(row.total_wallet_credit),
  };
}

export function formatCustomerBalance(row: CustomerBalanceRow) {
  return {
    customer_id: row.customer_id,
    business_id: row.business_id,
    full_name: row.full_name,
    email: row.email,
    customer_status: row.customer_status,
    total_outstanding: amount(row.total_outstanding),
    wallet_credit: amount(row.wallet_credit),
    net_balance: amount(row.net_balance),
  };
}

export function formatObligationAging(row: ObligationAgingRow) {
  return {
    obligation_id: row.obligation_id,
    business_id: row.business_id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    obligation_type: row.obligation_type,
    reference_code: row.reference_code,
    amount: amount(row.amount),
    amount_paid: amount(row.amount_paid),
    outstanding: amount(row.outstanding),
    due_date: row.due_date,
    status: row.status,
    days_overdue: row.days_overdue,
    aging_bucket: row.aging_bucket,
  };
}

export function formatAgingSummary(row: AgingSummaryRow) {
  return {
    business_id: row.business_id,
    aging_bucket: row.aging_bucket,
    obligation_count: row.obligation_count,
    total_outstanding: amount(row.total_outstanding),
  };
}

export function formatObligationDetail(row: ObligationDetailRow) {
  return {
    obligation_id: row.obligation_id,
    business_id: row.business_id,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    obligation_type: row.obligation_type,
    reference_code: row.reference_code,
    amount: amount(row.amount),
    amount_paid: amount(row.amount_paid),
    outstanding: amount(row.outstanding),
    due_date: row.due_date,
    status: row.status,
    billing_rule_id: row.billing_rule_id,
    metadata: row.metadata ?? {},
    days_overdue: row.days_overdue,
    aging_bucket: row.aging_bucket,
    created_at: isoDate(row.created_at),
    updated_at: isoDate(row.updated_at),
  };
}

export function formatPaymentHistoryRow(row: ObligationPaymentHistoryRow) {
  return {
    obligation_id: row.obligation_id,
    business_id: row.business_id,
    customer_id: row.customer_id,
    obligation_type: row.obligation_type,
    reference_code: row.reference_code,
    obligation_amount: amount(row.obligation_amount),
    amount_paid: amount(row.amount_paid),
    obligation_status: row.obligation_status,
    ledger_entry_id: row.ledger_entry_id,
    entry_type: row.entry_type,
    allocation_amount:
      row.allocation_amount === null ? null : amount(row.allocation_amount),
    balance_after:
      row.balance_after === null ? null : amount(row.balance_after),
    description: row.description,
    allocated_at: isoDate(row.allocated_at),
    payment_event_id: row.payment_event_id,
    payment_amount:
      row.payment_amount === null ? null : amount(row.payment_amount),
    sender_name: row.sender_name,
    payment_received_at: isoDate(row.payment_received_at),
  };
}

export function formatLedgerHistoryRow(row: CustomerLedgerHistoryRow) {
  return {
    ledger_entry_id: row.ledger_entry_id,
    customer_id: row.customer_id,
    business_id: row.business_id,
    obligation_id: row.obligation_id,
    obligation_reference_code: row.obligation_reference_code,
    obligation_type: row.obligation_type,
    entry_type: row.entry_type,
    amount: amount(row.amount),
    balance_after: amount(row.balance_after),
    description: row.description,
    created_at: isoDate(row.created_at),
    payment_event_id: row.payment_event_id,
    payment_amount:
      row.payment_amount === null ? null : amount(row.payment_amount),
    sender_name: row.sender_name,
    payment_received_at: isoDate(row.payment_received_at),
  };
}
