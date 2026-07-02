import { http } from './client'
import type {
  CustomerWithVirtualAccount,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from './types'

export const customerClient = {
  listByBusiness(businessId: string) {
    return http.get<CustomerWithVirtualAccount[]>('/customers', {
      query: { business_id: businessId },
    })
  },

  getById(id: string) {
    return http.get<CustomerWithVirtualAccount>(`/customers/${encodeURIComponent(id)}`)
  },

  createCustomer(input: CreateCustomerRequest) {
    return http.post<CustomerWithVirtualAccount>('/customers', {
      business_id: input.businessId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      metadata: input.metadata,
    })
  },

  updateCustomer(id: string, input: UpdateCustomerRequest) {
    return http.patch<CustomerWithVirtualAccount>(`/customers/${encodeURIComponent(id)}`, {
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      status: input.status,
      metadata: input.metadata,
    })
  },
}
