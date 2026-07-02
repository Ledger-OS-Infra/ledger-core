import { http } from './client'
import type {
  RawBusinessMetrics,
  RawCustomerBalance,
  RawAgingResponse,
  BusinessMetrics,
  CustomerBalance,
  AgingSummary,
  ObligationAging,
} from './types'

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeBusinessMetrics(raw: RawBusinessMetrics): BusinessMetrics {
  return {
    totalOutstanding: parseFloat(raw.total_outstanding),
    overdueAmount: parseFloat(raw.overdue_amount),
    overdueObligationCount: raw.overdue_obligation_count,
    totalInflow: parseFloat(raw.total_inflow),
    totalWalletCredit: parseFloat(raw.total_wallet_credit),
  }
}

function normalizeCustomerBalance(raw: RawCustomerBalance): CustomerBalance {
  return {
    customerId: raw.customer_id,
    businessId: raw.business_id,
    fullName: raw.full_name,
    email: raw.email,
    customerStatus: raw.customer_status,
    totalOutstanding: parseFloat(raw.total_outstanding),
    walletCredit: parseFloat(raw.wallet_credit),
    netBalance: parseFloat(raw.net_balance),
  }
}

function normalizeAgingResponse(raw: RawAgingResponse): AgingSummary {
  const obligations: ObligationAging[] = raw.obligations.map((o) => ({
    obligationId: o.obligation_id,
    customerId: o.customer_id,
    customerName: o.customer_name,
    amount: parseFloat(o.amount),
    outstanding: parseFloat(o.outstanding),
    dueDate: o.due_date,
    status: o.status,
    daysOverdue: o.days_overdue,
    agingBucket: o.aging_bucket,
  }))


  // dashboard/reports pages need: { '0-30': number, '31-60': number, ... }
  const summary = Object.fromEntries(
    raw.summary.map((row) => [row.aging_bucket, parseFloat(row.total_outstanding)]),
  )

  return { obligations, summary }
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

  async listBusinessCustomers(businessId: string): Promise<CustomerBalance[]> {
    const raw = await http.get<RawCustomerBalance[]>(
      `/reporting/business/${encodeURIComponent(businessId)}/customers`,
    )
    return raw.map(normalizeCustomerBalance)
  },

  async listAging(businessId: string): Promise<AgingSummary> {
    const raw = await http.get<RawAgingResponse>(
      `/reporting/business/${encodeURIComponent(businessId)}/aging`,
    )
    return normalizeAgingResponse(raw)
  },

  getObligationPayments(obligationId: string) {
    return http.get<Array<{ id: string; amount: number; paid_at: string }>>(
      `/reporting/obligations/${encodeURIComponent(obligationId)}/payments`,
    )
  },
}
