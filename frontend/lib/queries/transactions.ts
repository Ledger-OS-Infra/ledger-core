import { useQuery } from '@tanstack/react-query'
import { reportingClient } from '@/lib/api'
import type { BusinessTransaction, PaginatedResult } from '@/lib/api/types'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export function useTransactionsQuery(
  businessId: string | null,
  params: {
    page?: number
    limit?: number
    matchStatus?: 'matched' | 'unmatched'
  } = {},
) {
  return useQuery({
    enabled: !!businessId,
    queryKey: queryKeys.transactions(businessId!, {
      page: params.page,
      matchStatus: params.matchStatus,
    }),
    queryFn: async (): Promise<PaginatedResult<BusinessTransaction>> => {
      return reportingClient.listTransactions(businessId!, params)
    },
    staleTime: STALE_TIME,
  })
}
