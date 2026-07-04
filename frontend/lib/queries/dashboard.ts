import { useQuery } from '@tanstack/react-query'
import { customerClient, reportingClient } from '@/lib/api'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export function useDashboardQuery(businessId: string | null) {
  return useQuery({
    enabled: !!businessId,
    queryKey: queryKeys.dashboard(businessId!),
    queryFn: async () => {
      const id = businessId!
      const [metrics, aging, transactions, customers] = await Promise.all([
        reportingClient.getBusinessMetrics(id),
        reportingClient.listAging(id),
        reportingClient.listTransactions(id, { limit: 10 }),
        customerClient.listByBusiness(id),
      ])

      return {
        metrics,
        agingSummary: aging.summary,
        transactions,
        customers,
      }
    },
    staleTime: STALE_TIME,
  })
}
