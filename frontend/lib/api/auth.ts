import { http } from './client'

export interface SignupRequest {
  full_name: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: { id: string; email: string; fullName: string }
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  emailVerified: boolean
  status: string
  workspaces: { businessId: string; name: string; role: string }[]
}

export const authClient = {
  signup(input: SignupRequest) {
    return http.post<{ message: string }>('/auth/signup', input)
  },

  login(input: LoginRequest) {
    return http.post<LoginResponse>('/auth/login', input)
  },

  verifyEmail(token: string) {
    return http.get<{ message: string }>('/auth/verify-email', { query: { token } })
  },

  forgotPassword(email: string) {
    return http.post<{ message: string }>('/auth/forgot-password', { email })
  },

  resetPassword(token: string, password: string) {
    return http.post<{ message: string }>('/auth/reset-password', { token, password })
  },

  refresh(refreshToken: string) {
    return http.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refresh_token: refreshToken },
    )
  },

  me() {
    return http.get<AuthUser>('/auth/me')
  },
}
