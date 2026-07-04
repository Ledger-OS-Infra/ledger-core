import { http } from './client'
import type {
  RawBusinessMetrics,
  RawCustomerBalance,
  RawAgingResponse,
  RawObligationAging,
  RawBusinessTransaction,
  RawCustomerLedgerEntry,
  BusinessMetrics,
  CustomerBalance,
  AgingSummary,
  ObligationAging,
  BusinessTransaction,
  CustomerLedgerEntry,
} from './types'

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/** Server stores amounts in kobo (1 NGN = 100 kobo); UI works in naira. */
function koboToNaira(value: string | number): number {
  return Number(value) / 100
}

function normalizeBusinessMetrics(raw: RawBusinessMetrics): BusinessMetrics {
  return {
    totalOutstanding: koboToNaira(raw.total_outstanding),
    overdueAmount: koboToNaira(raw.overdue_amount),
    overdueObligationCount: raw.overdue_obligation_count,
    totalInflow: koboToNaira(raw.total_inflow),
    totalWalletCredit: koboToNaira(raw.total_wallet_credit),
  }
}

function normalizeCustomerBalance(raw: RawCustomerBalance): CustomerBalance {
  return {
    customerId: raw.customer_id,
    businessId: raw.business_id,
    fullName: raw.full_name,
    email: raw.email,
    customerStatus: raw.customer_status,
    totalOutstanding: koboToNaira(raw.total_outstanding),
    walletCredit: koboToNaira(raw.wallet_credit),
    netBalance: koboToNaira(raw.net_balance),
  }
}

function normalizeObligationAging(o: RawObligationAging): ObligationAging {
  return {
    obligationId: o.obligation_id,
    customerId: o.customer_id,
    customerName: o.customer_name,
    obligationType: o.obligation_type,
    referenceCode: o.reference_code,
    amount: koboToNaira(o.amount),
    amountPaid: koboToNaira(o.amount_paid),
    outstanding: koboToNaira(o.outstanding),
    dueDate: o.due_date,
    status: o.status,
    daysOverdue: o.days_overdue,
    agingBucket: o.aging_bucket,
  }
}

function normalizeLedgerEntry(raw: RawCustomerLedgerEntry): CustomerLedgerEntry {
  return {
    ledgerEntryId: raw.ledger_entry_id,
    obligationId: raw.obligation_id,
    obligationReferenceCode: raw.obligation_reference_code,
    obligationType: raw.obligation_type,
    entryType: raw.entry_type,
    amount: koboToNaira(raw.amount),
    balanceAfter: koboToNaira(raw.balance_after),
    description: raw.description,
    createdAt: raw.created_at,
    senderName: raw.sender_name,
  }
}

function normalizeAgingResponse(raw: RawAgingResponse): AgingSummary {
  const obligations = raw.obligations.data.map(normalizeObligationAging)

  // Lookup map keyed by DB bucket (e.g. '1_30_days'), values in naira.
  const summary = Object.fromEntries(
    raw.summary.map((row) => [row.aging_bucket, koboToNaira(row.total_outstanding)]),
  )

  return { obligations, summary }
}

function normalizeTransaction(raw: RawBusinessTransaction): BusinessTransaction {
  return {
    id: raw.id,
    businessId: raw.business_id,
    customerId: raw.customer_id,
    customerName: raw.customer_name,
    amount: koboToNaira(raw.amount),
    senderName: raw.sender_name,
    isMatched: raw.is_matched,
    receivedAt: raw.received_at,
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const reportingClient = {
  async getBusinessMetrics(businessId: string): Promise<BusinessMetrics> {
    const raw = await http.get<RawBusinessMetrics>(
      `/reporting/business/${encodeURIComponent(businessId)}/metrics`,
    )
    return normalizeBusinessMetrics(raw)
  },

  async listBusinessCustomers(
    businessId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<CustomerBalance[]> {
    const raw = await http.get<RawCustomerBalance[]>(
      `/reporting/business/${encodeURIComponent(businessId)}/customers`,
      { query: { page: params.page, limit: params.limit } },
    )
    return raw.map(normalizeCustomerBalance)
  },

  async listAging(businessId: string): Promise<AgingSummary> {
    const raw = await http.get<RawAgingResponse>(
      `/reporting/business/${encodeURIComponent(businessId)}/aging`,
    )
    return normalizeAgingResponse(raw)
  },

  async listTransactions(
    businessId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<BusinessTransaction[]> {
    const raw = await http.get<RawBusinessTransaction[]>(
      `/reporting/business/${encodeURIComponent(businessId)}/transactions`,
      { query: { page: params.page, limit: params.limit } },
    )
    return raw.map(normalizeTransaction)
  },

  async getCustomerBalance(customerId: string): Promise<CustomerBalance> {
    const raw = await http.get<RawCustomerBalance>(
      `/reporting/customers/${encodeURIComponent(customerId)}`,
    )
    return normalizeCustomerBalance(raw)
  },

  async listCustomerObligations(
    customerId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<ObligationAging[]> {
    const raw = await http.get<RawObligationAging[]>(
      `/reporting/customers/${encodeURIComponent(customerId)}/obligations`,
      { query: { page: params.page, limit: params.limit } },
    )
    return raw.map(normalizeObligationAging)
  },

  async listCustomerLedger(
    customerId: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<CustomerLedgerEntry[]> {
    const raw = await http.get<RawCustomerLedgerEntry[]>(
      `/reporting/customers/${encodeURIComponent(customerId)}/ledger`,
      { query: { page: params.page, limit: params.limit } },
    )
    return raw.map(normalizeLedgerEntry)
  },

  getObligationPayments(obligationId: string) {
    return http.get<Array<{ id: string; amount: number; paid_at: string }>>(
      `/reporting/obligations/${encodeURIComponent(obligationId)}/payments`,
    )
  },
}
