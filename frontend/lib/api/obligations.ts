import { nairaToKobo } from '@/lib/currency'
import { http } from './client'
import type { CreateObligationRequest, Obligation, RawObligation } from './types'

function koboToNaira(value: number): number {
  return value / 100
}

function normalizeObligation(raw: RawObligation): Obligation {
  return {
    id: raw.id,
    customerId: raw.customer_id,
    businessId: raw.business_id,
    billingRuleId: raw.billing_rule_id,
    type: raw.type,
    referenceCode: raw.reference_code,
    amount: koboToNaira(raw.amount),
    amountPaid: koboToNaira(raw.amount_paid),
    outstandingBalance: koboToNaira(raw.outstanding_balance),
    dueDate: raw.due_date,
    status: raw.status,
    metadata: raw.metadata ?? {},
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export const obligationClient = {
  create(input: CreateObligationRequest) {
    return http
      .post<RawObligation>(
        `/customers/${encodeURIComponent(input.customerId)}/obligations`,
        {
          type: input.type,
          amount: nairaToKobo(input.amount),
          due_date: input.dueDate,
          reference_code: input.referenceCode,
          metadata: input.metadata,
        },
      )
      .then(normalizeObligation)
  },

  getById(obligationId: string) {
    return http
      .get<RawObligation>(`/obligations/${encodeURIComponent(obligationId)}`)
      .then(normalizeObligation)
  },
}
