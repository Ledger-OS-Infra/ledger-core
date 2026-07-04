import { nairaToKobo } from '@/lib/currency'
import { http } from './client'
import type {
  BillingRule,
  CreateBillingRuleRequest,
  RawBillingRule,
} from './types'

function koboToNaira(value: number): number {
  return value / 100
}

function normalizeBillingRule(raw: RawBillingRule): BillingRule {
  return {
    id: raw.id,
    customerId: raw.customer_id,
    businessId: raw.business_id,
    obligationType: raw.obligation_type,
    amount: koboToNaira(raw.amount),
    recurrence: raw.recurrence,
    dayOfMonth: raw.day_of_month,
    nextRunDate: raw.next_run_date,
    isActive: raw.is_active,
    metadata: raw.metadata ?? {},
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export const billingClient = {
  listByBusiness(businessId: string) {
    return http
      .get<Array<RawBillingRule & { customer_name: string }>>(
        `/business/${encodeURIComponent(businessId)}/billing-rules`,
      )
      .then((rules) =>
        rules.map((rule) => ({
          ...normalizeBillingRule(rule),
          customerName: rule.customer_name,
        })),
      )
  },

  listByCustomer(customerId: string) {
    return http
      .get<RawBillingRule[]>(
        `/customers/${encodeURIComponent(customerId)}/billing-rules`,
      )
      .then((rules) => rules.map(normalizeBillingRule))
  },

  create(input: CreateBillingRuleRequest) {
    return http
      .post<RawBillingRule>(
        `/customers/${encodeURIComponent(input.customerId)}/billing-rules`,
        {
          obligation_type: input.obligationType,
          amount: nairaToKobo(input.amount),
          frequency: 'MONTHLY',
          day_of_month: input.dayOfMonth,
          start_date: input.startDate,
          metadata: input.metadata,
        },
      )
      .then(normalizeBillingRule)
  },
}
