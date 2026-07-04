import { useQuery } from '@tanstack/react-query'
import { customerClient, reportingClient } from '@/lib/api'
import type { CustomerWithVirtualAccount } from '@/lib/api/types'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export type CustomerListItem = CustomerWithVirtualAccount & {
  outstanding: number
  walletCredit: number
}

export function useCustomersQuery(businessId: string | null) {
  return useQuery({
    enabled: !!businessId,
    queryKey: queryKeys.customers(businessId!),
    queryFn: async (): Promise<CustomerListItem[]> => {
      const id = businessId!
      const [records, balances] = await Promise.all([
        customerClient.listByBusiness(id),
        reportingClient.listBusinessCustomers(id, { limit: 100 }),
      ])

      const balanceById = new Map(balances.map((b) => [b.customerId, b]))
      return records.map((record) => ({
        ...record,
        outstanding: balanceById.get(record.id)?.totalOutstanding ?? 0,
        walletCredit: balanceById.get(record.id)?.walletCredit ?? 0,
      }))
    },
    staleTime: STALE_TIME,
  })
}

export function useCustomerDetailQuery(customerId: string | undefined) {
  return useQuery({
    enabled: !!customerId,
    queryKey: queryKeys.customer(customerId!),
    queryFn: async () => {
      const id = customerId!
      const record = await customerClient.getById(id)
      const [balance, obligations, ledger] = await Promise.all([
        reportingClient.getCustomerBalance(id),
        reportingClient.listCustomerObligations(id, { limit: 100 }),
        reportingClient.listCustomerLedger(id, { limit: 50 }),
      ])
      return { record, balance, obligations, ledger }
    },
    staleTime: STALE_TIME,
  })
}
