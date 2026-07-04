/** Central query keys — keeps cache lookups consistent across pages. */
export const queryKeys = {
  dashboard: (businessId: string) => ['dashboard', businessId] as const,
  customers: (businessId: string) => ['customers', businessId] as const,
  customer: (customerId: string) => ['customer', customerId] as const,
  obligations: (
    businessId: string,
    params: { page?: number; status?: string; type?: string } = {},
  ) => ['obligations', businessId, params] as const,
  transactions: (
    businessId: string,
    params: { page?: number; status?: string } = {},
  ) => ['transactions', businessId, params] as const,
  billingRules: (businessId: string) => ['billingRules', businessId] as const,
  reports: (businessId: string) => ['reports', businessId] as const,
}
