/** Central query keys — keeps cache lookups consistent across pages. */
export const queryKeys = {
  dashboard: (businessId: string) => ['dashboard', businessId] as const,
  customers: (businessId: string) => ['customers', businessId] as const,
  customer: (customerId: string) => ['customer', customerId] as const,
  obligations: (businessId: string) => ['obligations', businessId] as const,
}
