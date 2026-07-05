import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billingClient } from '@/lib/api'
import type {
  BillingRuleListItem,
  CreateBillingRuleRequest,
} from '@/lib/api/types'
import { queryKeys } from './keys'

const STALE_TIME = 5 * 60 * 1_000 // 5 minutes

export function useBillingRulesQuery(businessId: string | null) {
  return useQuery({
    enabled: !!businessId,
    queryKey: queryKeys.billingRules(businessId!),
    queryFn: async (): Promise<BillingRuleListItem[]> => {
      return billingClient.listByBusiness(businessId!)
    },
    staleTime: STALE_TIME,
  })
}

export function useCreateBillingRuleMutation(businessId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBillingRuleRequest) => billingClient.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.billingRules(businessId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard(businessId),
      })
    },
  })
}
