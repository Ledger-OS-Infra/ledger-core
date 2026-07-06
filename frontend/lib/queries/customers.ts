import { useQuery, useQueryClient } from '@tanstack/react-query'
import { customerClient, reportingClient } from '@/lib/api'
import type { CustomerWithVirtualAccount } from '@/lib/api/types'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export type CustomerListItem = CustomerWithVirtualAccount & {
  outstanding: number
  walletCredit: number
}

function customerFromListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  customerId: string,
): CustomerWithVirtualAccount | undefined {
  const entries = queryClient.getQueriesData<CustomerListItem[]>({
    queryKey: ['customers'],
  })

  for (const [, customers] of entries) {
    const match = customers?.find((customer) => customer.id === customerId)
    if (match) return match
  }

  return undefined
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

export function useCustomerRecordQuery(customerId: string | undefined) {
  const queryClient = useQueryClient()

  return useQuery({
    enabled: !!customerId,
    queryKey: [...queryKeys.customer(customerId!), 'record'] as const,
    queryFn: () => customerClient.getById(customerId!),
    placeholderData: () =>
      customerId ? customerFromListCache(queryClient, customerId) : undefined,
    staleTime: STALE_TIME,
  })
}

export function useCustomerReportingQuery(customerId: string | undefined) {
  return useQuery({
    enabled: !!customerId,
    queryKey: [...queryKeys.customer(customerId!), 'reporting'] as const,
    queryFn: () => reportingClient.getCustomerDetail(customerId!),
    staleTime: STALE_TIME,
  })
}

export function useCustomerDetailQuery(customerId: string | undefined) {
  const recordQuery = useCustomerRecordQuery(customerId)
  const reportingQuery = useCustomerReportingQuery(customerId)

  return {
    data:
      recordQuery.data && reportingQuery.data
        ? {
            record: recordQuery.data,
            ...reportingQuery.data,
          }
        : undefined,
    isLoading: recordQuery.isLoading && !recordQuery.data,
    isFetching: recordQuery.isFetching || reportingQuery.isFetching,
    isError: recordQuery.isError,
    recordQuery,
    reportingQuery,
  }
}
