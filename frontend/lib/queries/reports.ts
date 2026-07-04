import { useQuery } from '@tanstack/react-query'
import { reportingClient } from '@/lib/api'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export function useReportsQuery(businessId: string | null) {
  return useQuery({
    enabled: !!businessId,
    queryKey: queryKeys.reports(businessId!),
    queryFn: async () => {
      const id = businessId!
      const [aging, monthlyInflow, customers] = await Promise.all([
        reportingClient.listAging(id, { limit: 1 }),
        reportingClient.listMonthlyInflow(id, { months: 6 }),
        reportingClient.listBusinessCustomers(id, { limit: 100 }),
      ])

      return { aging, monthlyInflow, customers }
    },
    staleTime: STALE_TIME,
  })
}
