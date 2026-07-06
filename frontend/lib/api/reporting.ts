import { http } from './client'
import type {
  RawBusinessMetrics,
  RawCustomerBalance,
  RawAgingResponse,
  RawMonthlyInflow,
  RawObligationAging,
  RawBusinessTransaction,
  RawCustomerLedgerEntry,
  BusinessMetrics,
  CustomerBalance,
  AgingSummary,
  ObligationAging,
  BusinessTransaction,
  CustomerLedgerEntry,
  MonthlyInflowPoint,
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

  const buckets = Object.fromEntries(
    raw.summary.map((row) => [
      row.aging_bucket,
      {
        amount: koboToNaira(row.total_outstanding),
        count: row.obligation_count,
      },
    ]),
  )

  const summary = Object.fromEntries(
    raw.summary.map((row) => [row.aging_bucket, koboToNaira(row.total_outstanding)]),
  )

  return { obligations, summary, buckets }
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

/** Fills missing months with zero so the chart always shows N points. */
export function buildMonthlyInflowSeries(
  rows: MonthlyInflowPoint[],
  months = 6,
  today = new Date(),
): MonthlyInflowPoint[] {
  const byMonth = new Map(rows.map((row) => [row.month, row.amount]))
  const points: MonthlyInflowPoint[] = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    points.push({
      month: date.toLocaleDateString('en-NG', { month: 'short' }),
      amount: byMonth.get(key) ?? 0,
    })
  }

  return points
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

  async listBusinessObligations(
    businessId: string,
    params: { page?: number; limit?: number; status?: string; type?: string } = {},
  ) {
    const result = await http.getPaginated<RawObligationAging>(
      `/reporting/business/${encodeURIComponent(businessId)}/obligations`,
      {
        query: {
          page: params.page,
          limit: params.limit,
          status: params.status,
          type: params.type,
        },
      },
    )

    return {
      items: result.items.map(normalizeObligationAging),
      pagination: result.pagination,
    }
  },

  async listAging(
    businessId: string,
    params: { page?: number; limit?: number; bucket?: string; summaryOnly?: boolean } = {},
  ): Promise<AgingSummary> {
    const raw = await http.get<RawAgingResponse>(
      `/reporting/business/${encodeURIComponent(businessId)}/aging`,
      {
        query: {
          page: params.page,
          limit: params.limit,
          bucket: params.bucket,
          summary_only: params.summaryOnly ? 'true' : undefined,
        },
      },
    )
    return normalizeAgingResponse(raw)
  },

  async listMonthlyInflow(
    businessId: string,
    params: { months?: number } = {},
  ): Promise<MonthlyInflowPoint[]> {
    const raw = await http.get<RawMonthlyInflow[]>(
      `/reporting/business/${encodeURIComponent(businessId)}/inflow/monthly`,
      { query: { months: params.months ?? 6 } },
    )
    return buildMonthlyInflowSeries(raw.map((row) => ({
      month: row.month,
      amount: koboToNaira(row.total),
    })), params.months ?? 6)
  },

  async listTransactions(
    businessId: string,
    params: { page?: number; limit?: number; matchStatus?: 'matched' | 'unmatched' } = {},
  ) {
    const result = await http.getPaginated<RawBusinessTransaction>(
      `/reporting/business/${encodeURIComponent(businessId)}/transactions`,
      {
        query: {
          page: params.page,
          limit: params.limit,
          match_status: params.matchStatus,
        },
      },
    )

    return {
      items: result.items.map(normalizeTransaction),
      pagination: result.pagination,
    }
  },

  async getCustomerBalance(customerId: string): Promise<CustomerBalance> {
    const raw = await http.get<RawCustomerBalance>(
      `/reporting/customers/${encodeURIComponent(customerId)}`,
    )
    return normalizeCustomerBalance(raw)
  },

  async getCustomerDetail(customerId: string): Promise<{
    balance: CustomerBalance
    obligations: ObligationAging[]
    ledger: CustomerLedgerEntry[]
  }> {
    const raw = await http.get<{
      balance: RawCustomerBalance
      obligations: RawObligationAging[]
      ledger: RawCustomerLedgerEntry[]
    }>(`/reporting/customers/${encodeURIComponent(customerId)}/detail`)

    return {
      balance: normalizeCustomerBalance(raw.balance),
      obligations: raw.obligations.map(normalizeObligationAging),
      ledger: raw.ledger.map(normalizeLedgerEntry),
    }
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

  async exportObligations(
    businessId: string,
    params: { status?: string; type?: string } = {},
  ): Promise<Blob> {
    return http.getBlob(
      `/reporting/business/${encodeURIComponent(businessId)}/obligations/export`,
      { query: { status: params.status, type: params.type } },
    )
  },
}
