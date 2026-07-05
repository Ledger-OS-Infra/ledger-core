import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { obligationClient, reportingClient } from '@/lib/api'
import type {
  CreateObligationRequest,
  ObligationAging,
  PaginatedResult,
} from '@/lib/api/types'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export function useObligationsQuery(
  businessId: string | null,
  params: {
    page?: number
    limit?: number
    status?: string
    type?: string
  } = {},
) {
  const listParams = {
    page: params.page,
    status: params.status,
    type: params.type,
  }

  return useQuery({
    enabled: !!businessId,
    queryKey: queryKeys.obligations(businessId!, listParams),
    queryFn: async (): Promise<PaginatedResult<ObligationAging>> => {
      return reportingClient.listBusinessObligations(businessId!, {
        page: params.page,
        limit: params.limit,
        status: params.status,
        type: params.type,
      })
    },
    staleTime: STALE_TIME,
  })
}

export function useCreateObligationMutation(businessId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateObligationRequest) => obligationClient.create(input),
    onSuccess: (_obligation, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['obligations', businessId],
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(businessId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers(businessId) })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customer(variables.customerId),
      })
    },
  })
}
