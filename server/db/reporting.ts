import {
  buildPaginationMeta,
  resolvePagination,
  type PaginatedResult,
  type PaginationInput,
} from "../lib/pagination";
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

export interface ObligationDetailRow {
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
  billing_rule_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  days_overdue: number;
  aging_bucket: string;
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

export interface CustomerLedgerHistoryRow {
  ledger_entry_id: string;
  customer_id: string;
  business_id: string;
  obligation_id: string | null;
  obligation_reference_code: string | null;
  obligation_type: string | null;
  entry_type: string;
  amount: string;
  balance_after: string;
  description: string;
  created_at: Date;
  payment_event_id: string | null;
  payment_amount: string | null;
  sender_name: string | null;
  payment_received_at: Date | null;
}

export interface AgingListFilters {
  bucket?: string;
}

async function countRows(
  tableOrView: string,
  whereClause: string,
  values: unknown[],
): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::TEXT AS total FROM ${tableOrView} ${whereClause}`,
    values,
  );
  return Number(rows[0]?.total ?? 0);
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
  pagination: PaginationInput,
): Promise<PaginatedResult<CustomerBalanceRow>> {
  const { page, limit, offset } = resolvePagination(pagination);
  const total = await countRows(
    "v_customer_balance_summary",
    "WHERE business_id = $1",
    [businessId],
  );

  const { rows } = await pool.query<CustomerBalanceRow>(
    `SELECT *
     FROM v_customer_balance_summary
     WHERE business_id = $1
     ORDER BY full_name
     LIMIT $2 OFFSET $3`,
    [businessId, limit, offset],
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

export async function getCustomerBalance(
  customerId: string,
): Promise<CustomerBalanceRow | null> {
  const { rows } = await pool.query<CustomerBalanceRow>(
    `SELECT * FROM v_customer_balance_summary WHERE customer_id = $1`,
    [customerId],
  );
  return rows[0] ?? null;
}

export async function listCustomerOutstandingObligations(
  customerId: string,
  pagination: PaginationInput,
): Promise<PaginatedResult<ObligationAgingRow>> {
  const { page, limit, offset } = resolvePagination(pagination);
  const total = await countRows(
    "v_obligation_aging",
    "WHERE customer_id = $1",
    [customerId],
  );

  const { rows } = await pool.query<ObligationAgingRow>(
    `SELECT *
     FROM v_obligation_aging
     WHERE customer_id = $1
     ORDER BY due_date ASC, reference_code ASC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [customerId, limit, offset],
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

export async function listCustomerLedgerHistory(
  customerId: string,
  pagination: PaginationInput,
): Promise<PaginatedResult<CustomerLedgerHistoryRow>> {
  const { page, limit, offset } = resolvePagination(pagination);
  const total = await countRows(
    "v_customer_ledger_history",
    "WHERE customer_id = $1",
    [customerId],
  );

  const { rows } = await pool.query<CustomerLedgerHistoryRow>(
    `SELECT *
     FROM v_customer_ledger_history
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [customerId, limit, offset],
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

export async function listObligationAging(
  businessId: string,
  pagination: PaginationInput,
  filters: AgingListFilters = {},
): Promise<PaginatedResult<ObligationAgingRow>> {
  const { page, limit, offset } = resolvePagination(pagination);
  const values: unknown[] = [businessId];
  let whereClause = "WHERE business_id = $1";

  if (filters.bucket) {
    values.push(filters.bucket);
    whereClause += ` AND aging_bucket = $${values.length}`;
  }

  const total = await countRows("v_obligation_aging", whereClause, values);

  values.push(limit, offset);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const { rows } = await pool.query<ObligationAgingRow>(
    `SELECT *
     FROM v_obligation_aging
     ${whereClause}
     ORDER BY days_overdue DESC, due_date ASC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
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

export async function getObligationDetail(
  obligationId: string,
): Promise<ObligationDetailRow | null> {
  const { rows } = await pool.query<ObligationDetailRow>(
    `SELECT * FROM v_obligation_detail WHERE obligation_id = $1`,
    [obligationId],
  );
  return rows[0] ?? null;
}

export async function listObligationPaymentHistory(
  obligationId: string,
  pagination: PaginationInput,
): Promise<PaginatedResult<ObligationPaymentHistoryRow>> {
  const { page, limit, offset } = resolvePagination(pagination);
  const total = await countRows(
    "v_obligation_payment_history",
    "WHERE obligation_id = $1 AND ledger_entry_id IS NOT NULL",
    [obligationId],
  );

  const { rows } = await pool.query<ObligationPaymentHistoryRow>(
    `SELECT *
     FROM v_obligation_payment_history
     WHERE obligation_id = $1
       AND ledger_entry_id IS NOT NULL
     ORDER BY allocated_at DESC NULLS LAST
     LIMIT $2 OFFSET $3`,
    [obligationId, limit, offset],
  );

  return {
    items: rows,
    pagination: buildPaginationMeta(total, page, limit),
  };
}

export async function obligationExists(obligationId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM payment_obligations WHERE id = $1
     ) AS exists`,
    [obligationId],
  );
  return rows[0]?.exists ?? false;
}
