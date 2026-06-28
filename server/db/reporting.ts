import { pool } from "./pool";

export interface BusinessMetricsRow {
  business_id: string;
  business_name: string;
  total_inflow: string;
  total_outstanding: string;
  overdue_obligation_count: number;
  overdue_amount: string;
  total_wallet_credit: string;
}

export interface CustomerBalanceRow {
  customer_id: string;
  business_id: string;
  full_name: string;
  email: string | null;
  customer_status: string;
  total_outstanding: string;
  wallet_credit: string;
  net_balance: string;
}

export interface ObligationAgingRow {
  obligation_id: string;
  business_id: string;
  customer_id: string;
  customer_name: string;
  obligation_type: string;
  reference_code: string | null;
  amount: string;
  amount_paid: string;
  outstanding: string;
  due_date: string;
  status: string;
  days_overdue: number;
  aging_bucket: string;
}

export interface AgingSummaryRow {
  business_id: string;
  aging_bucket: string;
  obligation_count: number;
  total_outstanding: string;
}

export interface ObligationPaymentHistoryRow {
  obligation_id: string;
  business_id: string;
  customer_id: string;
  obligation_type: string;
  reference_code: string | null;
  obligation_amount: string;
  amount_paid: string;
  obligation_status: string;
  ledger_entry_id: string | null;
  entry_type: string | null;
  allocation_amount: string | null;
  balance_after: string | null;
  description: string | null;
  allocated_at: Date | null;
  payment_event_id: string | null;
  payment_amount: string | null;
  sender_name: string | null;
  payment_received_at: Date | null;
}

export async function getBusinessMetrics(
  businessId: string,
): Promise<BusinessMetricsRow | null> {
  const { rows } = await pool.query<BusinessMetricsRow>(
    `SELECT * FROM v_business_metrics WHERE business_id = $1`,
    [businessId],
  );
  return rows[0] ?? null;
}

export async function listCustomerBalances(
  businessId: string,
): Promise<CustomerBalanceRow[]> {
  const { rows } = await pool.query<CustomerBalanceRow>(
    `SELECT *
     FROM v_customer_balance_summary
     WHERE business_id = $1
     ORDER BY full_name`,
    [businessId],
  );
  return rows;
}

export async function listObligationAging(
  businessId: string,
): Promise<ObligationAgingRow[]> {
  const { rows } = await pool.query<ObligationAgingRow>(
    `SELECT *
     FROM v_obligation_aging
     WHERE business_id = $1
     ORDER BY days_overdue DESC, due_date ASC`,
    [businessId],
  );
  return rows;
}

export async function listAgingSummary(
  businessId: string,
): Promise<AgingSummaryRow[]> {
  const { rows } = await pool.query<AgingSummaryRow>(
    `SELECT *
     FROM v_obligation_aging_summary
     WHERE business_id = $1
     ORDER BY aging_bucket`,
    [businessId],
  );
  return rows;
}

export async function listObligationPaymentHistory(
  obligationId: string,
): Promise<ObligationPaymentHistoryRow[]> {
  const { rows } = await pool.query<ObligationPaymentHistoryRow>(
    `SELECT *
     FROM v_obligation_payment_history
     WHERE obligation_id = $1
     ORDER BY allocated_at NULLS LAST`,
    [obligationId],
  );
  return rows;
}
