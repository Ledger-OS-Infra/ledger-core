'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authClient, type AuthUser, type LoginResponse } from '@/lib/api/auth'
import { setTokenAccessor } from '@/lib/api/client'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  /** The active workspace's businessId (first workspace for now). */
  activeBusinessId: string | null
  /** The active workspace's display name (first workspace for now). */
  activeBusinessName: string | null
  login: (data: LoginResponse) => Promise<AuthUser | null>
  logout: () => void
  refreshUser: () => Promise<AuthUser | null>
}

const AuthContext = createContext<AuthState | null>(null)

const ACCESS_TOKEN_KEY = 'lc_access_token'
const REFRESH_TOKEN_KEY = 'lc_refresh_token'

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const AUTH_ROUTES = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
    router.push('/auth/login')
  }, [router])

  // Wire the token accessor so apiFetch can read it
  useEffect(() => {
    setTokenAccessor(getStoredToken)
  }, [])

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = getStoredToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return null
    }

    try {
      const me = await authClient.me()
      setUser(me)
      return me
    } catch {
      // Token expired — try refresh
      const refreshToken = getStoredRefreshToken()
      if (refreshToken) {
        try {
          const result = await authClient.refresh(refreshToken)
          storeTokens(result.accessToken, result.refreshToken)
          const me = await authClient.me()
          setUser(me)
          return me
        } catch {
          clearTokens()
          setUser(null)
          return null
        }
      }
      clearTokens()
      setUser(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(
    async (data: LoginResponse): Promise<AuthUser | null> => {
      storeTokens(data.accessToken, data.refreshToken)
      // Await the profile load so `user` is populated before the caller
      // navigates — otherwise the route guard sees a null user on a protected
      // route and bounces back to /auth/login (causing a flicker).
      return refreshUser()
    },
    [refreshUser],
  )

  // Bootstrap: load user on mount
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Route guard
  useEffect(() => {
    if (isLoading) return

    const hasWorkspace = (user?.workspaces.length ?? 0) > 0
    const onOnboarding = pathname === '/onboarding'

    if (!user) {
      if (!isAuthRoute) router.replace('/auth/login')
      return
    }

    // Authenticated but sitting on an auth page → send to the right place
    if (isAuthRoute) {
      router.replace(hasWorkspace ? '/dashboard' : '/onboarding')
      return
    }

    // Authenticated without a workspace → must create one first
    if (!hasWorkspace && !onOnboarding) {
      router.replace('/onboarding')
      return
    }

    // Already has a workspace but stuck on onboarding → go to dashboard
    if (hasWorkspace && onOnboarding) {
      router.replace('/dashboard')
    }
  }, [user, isLoading, isAuthRoute, pathname, router])

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      activeBusinessId: user?.workspaces[0]?.businessId ?? null,
      activeBusinessName: user?.workspaces[0]?.name ?? null,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  )

  // Show nothing until auth state resolves (prevents flash)
  if (isLoading) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex h-screen items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AuthContext.Provider>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
