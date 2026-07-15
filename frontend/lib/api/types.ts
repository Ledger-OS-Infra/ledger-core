// Shared query-param type used across the API layer
export type QueryParams = Record<string, string | number | boolean | null | undefined>

// ---------------------------------------------------------------------------
// Customer types
// ---------------------------------------------------------------------------

export type CustomerStatus = 'ACTIVE' | 'INACTIVE'

export interface VirtualAccount {
  id: string
  customer_id: string
  nomba_account_ref: string
  account_number: string
  bank_name: string
  bank_code: string | null
  is_active: boolean
  created_at: string
}

export interface CustomerWithVirtualAccount {
  id: string
  business_id: string
  full_name: string
  email: string | null
  phone: string | null
  status: CustomerStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  virtual_account: VirtualAccount
}

export interface CreateCustomerRequest {
  businessId: string;
  fullName: string;
  email: string
  phone?: string | null
  password: string
  metadata?: Record<string, unknown>
}

export interface UpdateCustomerRequest {
  fullName?: string
  email?: string | null
  phone?: string | null
  status?: CustomerStatus
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Reporting — raw server shapes (snake_case, values may be numeric strings)
// ---------------------------------------------------------------------------

/** Raw row from `v_business_metrics` */
export interface RawBusinessMetrics {
  business_id: string
  business_name: string
  total_inflow: string
  total_outstanding: string
  overdue_obligation_count: number
  overdue_amount: string
  total_wallet_credit: string
}

/** Raw row from `v_customer_balance_summary` */
export interface RawCustomerBalance {
  customer_id: string
  business_id: string
  full_name: string
  email: string | null
  customer_status: string
  total_outstanding: string
  wallet_credit: string
  net_balance: string
}

/** Raw row from `v_obligation_aging` */
export interface RawObligationAging {
  obligation_id: string
  business_id: string
  customer_id: string
  customer_name: string
  obligation_type: string
  reference_code: string | null
  amount: string
  amount_paid: string
  outstanding: string
  due_date: string
  status: string
  days_overdue: number
  aging_bucket: string
}

/** Raw row from `v_obligation_aging_summary` */
export interface RawAgingSummaryRow {
  business_id: string
  aging_bucket: string
  obligation_count: number
  total_outstanding: string
}

/** Paginated envelope used by list endpoints: `{ data, pagination }` */
export interface RawPaginationMeta {
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface RawPaginated<T> {
  data: T[]
  pagination: RawPaginationMeta
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  items: T[]
  pagination: PaginationMeta
}

/** Raw row from GET /reporting/business/:id/inflow/monthly */
export interface RawMonthlyInflow {
  month: string
  total: number
}

export interface AgingBucketSummary {
  amount: number
  count: number
}

/** Raw response body from GET /reporting/.../aging */
export interface RawAgingResponse {
  obligations: RawPaginated<RawObligationAging>
  summary: RawAgingSummaryRow[]
}

/** Raw row from GET /reporting/business/:id/transactions (payment events) */
export interface RawBusinessTransaction {
  id: string
  business_id: string
  customer_id: string | null
  customer_name: string | null
  amount: number
  sender_name: string | null
  is_matched: boolean
  received_at: string | null
}

// ---------------------------------------------------------------------------
// Reporting — normalized frontend types (camelCase, parsed numbers)
// These are what components and utilities should consume.
// ---------------------------------------------------------------------------

export interface BusinessMetrics {
  totalOutstanding: number
  overdueAmount: number
  overdueObligationCount: number
  totalInflow: number
  totalWalletCredit: number
}

export interface CustomerBalance {
  customerId: string
  businessId: string
  fullName: string
  email: string | null
  customerStatus: string
  totalOutstanding: number
  walletCredit: number
  netBalance: number
}

export interface ObligationAging {
  obligationId: string
  customerId: string
  customerName: string
  obligationType: string
  referenceCode: string | null
  amount: number
  amountPaid: number
  outstanding: number
  dueDate: string
  status: string
  daysOverdue: number
  agingBucket: string
}

/** Normalized aging response — summary is a pre-built lookup map */
export interface AgingSummary {
  obligations: ObligationAging[]
  /** Keyed by DB aging bucket, values in naira. e.g. { '1_30_days': 120000, ... } */
  summary: Record<string, number>
  /** Amount + count per DB aging bucket */
  buckets: Record<string, AgingBucketSummary>
}

export interface MonthlyInflowPoint {
  month: string
  amount: number
}

/** Raw row from GET /reporting/customers/:id/ledger */
export interface RawCustomerLedgerEntry {
  ledger_entry_id: string
  customer_id: string
  business_id: string
  obligation_id: string | null
  obligation_reference_code: string | null
  obligation_type: string | null
  entry_type: string
  amount: number
  balance_after: number
  description: string
  created_at: string | null
  payment_event_id: string | null
  payment_amount: number | null
  sender_name: string | null
  payment_received_at: string | null
}

/** Normalized ledger entry (amounts in naira) */
export interface CustomerLedgerEntry {
  ledgerEntryId: string
  obligationId: string | null
  obligationReferenceCode: string | null
  obligationType: string | null
  entryType: string
  amount: number
  balanceAfter: number
  description: string
  createdAt: string | null
  senderName: string | null
}

// ---------------------------------------------------------------------------
// Obligation CRUD types (amounts normalized to naira in the client)
// ---------------------------------------------------------------------------

export type ObligationType =
  | 'INVOICE'
  | 'SUBSCRIPTION'
  | 'FEE'
  | 'LEVY'
  | 'CUSTOM'

export type ObligationStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE'

/** Raw obligation from POST/GET /obligations endpoints (amounts in kobo) */
export interface RawObligation {
  id: string
  customer_id: string
  business_id: string
  billing_rule_id: string | null
  type: ObligationType
  reference_code: string | null
  amount: number
  amount_paid: number
  outstanding_balance: number
  due_date: string
  status: ObligationStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Obligation {
  id: string
  customerId: string
  businessId: string
  billingRuleId: string | null
  type: ObligationType
  referenceCode: string | null
  amount: number
  amountPaid: number
  outstandingBalance: number
  dueDate: string
  status: ObligationStatus
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateObligationRequest {
  customerId: string
  type: ObligationType
  /** Amount in naira — converted to kobo before POST */
  amount: number
  dueDate: string
  referenceCode?: string
  metadata?: Record<string, unknown>
}

/** Normalized payment event / transaction (amounts in naira) */
export interface BusinessTransaction {
  id: string
  businessId: string
  customerId: string | null
  customerName: string | null
  amount: number
  senderName: string | null
  isMatched: boolean
  receivedAt: string | null
}

// ---------------------------------------------------------------------------
// Billing rule types (amounts normalized to naira in the client)
// ---------------------------------------------------------------------------

export type BillingRecurrence = 'MONTHLY'

export interface RawBillingRule {
  id: string
  customer_id: string
  business_id: string
  obligation_type: ObligationType
  amount: number
  recurrence: BillingRecurrence
  day_of_month: number
  next_run_date: string
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface BillingRule {
  id: string
  customerId: string
  businessId: string
  obligationType: ObligationType
  amount: number
  recurrence: BillingRecurrence
  dayOfMonth: number
  nextRunDate: string
  isActive: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface BillingRuleListItem extends BillingRule {
  customerName: string
}

export interface CreateBillingRuleRequest {
  customerId: string
  obligationType: ObligationType
  /** Amount in naira — converted to kobo before POST */
  amount: number
  dayOfMonth: number
  startDate: string
  metadata?: Record<string, unknown>
}
