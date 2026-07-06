import { useQuery } from '@tanstack/react-query'
import { businessClient, customerClient, reportingClient } from '@/lib/api'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export function useDashboardQuery(businessId: string | null) {
  return useQuery({
    enabled: !!businessId,
    queryKey: queryKeys.dashboard(businessId!),
    queryFn: async () => {
      const id = businessId!
      const [metrics, aging, transactionResult, customers, nombaAccount] =
        await Promise.all([
          reportingClient.getBusinessMetrics(id),
          reportingClient.listAging(id, { summaryOnly: true }),
          reportingClient.listTransactions(id),
          customerClient.listByBusiness(id),
          businessClient.getNombaAccount(id).catch(() => null),
        ])

      return {
        metrics,
        agingSummary: aging.summary,
        transactions: transactionResult.items,
        transactionPagination: transactionResult.pagination,
        customers,
        nombaAccount,
      }
    },
    staleTime: STALE_TIME,
  })
}
