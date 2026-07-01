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
  businessId: string
  fullName: string
  email?: string | null
  phone?: string | null
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

/** Raw response body from GET /reporting/.../aging */
export interface RawAgingResponse {
  obligations: RawObligationAging[]
  summary: RawAgingSummaryRow[]
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
  amount: number
  outstanding: number
  dueDate: string
  status: string
  daysOverdue: number
  agingBucket: string
}

/** Normalized aging response — summary is a pre-built lookup map */
export interface AgingSummary {
  obligations: ObligationAging[]
  /** e.g. { '0-30': 120000, '31-60': 80000, ... } */
  summary: Record<string, number>
}
