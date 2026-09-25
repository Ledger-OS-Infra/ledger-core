import { http } from './client'

export interface Workspace {
  businessId: string
  name: string
  role: string
}

export const businessClient = {
  list() {
    return http.get<Workspace[]>('/businesses')
  },

  create(input: { name: string }) {
    return http.post<Workspace>('/businesses', { name: input.name })
  },
}
