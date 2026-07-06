import type { PaginationMeta, QueryParams } from './types'
import {
  clearAuthTokens,
  getStoredRefreshToken,
  readAccessToken,
  storeAuthTokens,
} from '@/lib/auth-storage'

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
  if (configured) return configured

  // Same-origin requests — proxied to the API via next.config rewrites when
  // API_PROXY_TARGET is set on Vercel (or locally for parity testing).
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return process.env.API_PROXY_TARGET?.replace(/\/+$/, '') ?? 'http://localhost:3050'
}

function buildUrl(path: string, query?: QueryParams): string {
  const baseUrl = apiBaseUrl()
  const url = new URL(path.startsWith('/') ? path : `/${path}`, baseUrl)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }

  return url.toString()
}

// ---------------------------------------------------------------------------
// Token injection — set by AuthProvider at startup
// ---------------------------------------------------------------------------

let tokenAccessor: (() => string | null) | null = null
let sessionExpiredHandler: (() => void) | null = null
let refreshInFlight: Promise<boolean> | null = null

export function setTokenAccessor(fn: () => string | null) {
  tokenAccessor = fn
}

export function setSessionExpiredHandler(fn: () => void) {
  sessionExpiredHandler = fn
}

function shouldAttemptTokenRefresh(path: string): boolean {
  return (
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/refresh') &&
    !path.startsWith('/auth/signup')
  )
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) return false

    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        clearAuthTokens()
        return false
      }

      const json = (await response.json()) as {
        data: { accessToken: string; refreshToken: string }
      }
      storeAuthTokens(json.data.accessToken, json.data.refreshToken)
      return true
    } catch {
      clearAuthTokens()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

async function parseErrorBody(
  response: Response,
): Promise<{ message: string; code?: string }> {
  let message = `API request failed [${response.status}]`
  let code: string | undefined

  try {
    const body = (await response.json()) as {
      error?: { message?: string; code?: string }
    }
    message = body.error?.message ?? message
    code = body.error?.code
  } catch {
    // body wasn't JSON
  }

  return { message, code }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

type ApiFetchInit = RequestInit & { query?: QueryParams }

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
  }
}

async function apiFetch<T>(
  path: string,
  init?: ApiFetchInit,
  retriedAfterRefresh = false,
): Promise<T> {
  const authHeaders: Record<string, string> = {}
  const token = tokenAccessor?.() ?? readAccessToken()
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(path, init?.query), {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const { message, code } = await parseErrorBody(response)

    if (
      !retriedAfterRefresh &&
      response.status === 401 &&
      code === 'INVALID_ACCESS_TOKEN' &&
      shouldAttemptTokenRefresh(path)
    ) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return apiFetch<T>(path, init, true)
      }
      sessionExpiredHandler?.()
    }

    throw new ApiError(message, response.status, code)
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

async function apiFetchPaginated<T>(
  path: string,
  init?: ApiFetchInit,
  retriedAfterRefresh = false,
): Promise<{ items: T[]; pagination: PaginationMeta }> {
  const authHeaders: Record<string, string> = {}
  const token = tokenAccessor?.() ?? readAccessToken()
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(path, init?.query), {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
    ...init,
    method: init?.method ?? 'GET',
  })

  if (!response.ok) {
    const { message, code } = await parseErrorBody(response)

    if (
      !retriedAfterRefresh &&
      response.status === 401 &&
      code === 'INVALID_ACCESS_TOKEN' &&
      shouldAttemptTokenRefresh(path)
    ) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return apiFetchPaginated<T>(path, init, true)
      }
      sessionExpiredHandler?.()
    }

    throw new ApiError(message, response.status, code)
  }

  const json = (await response.json()) as {
    data: T[]
    pagination: {
      page: number
      limit: number
      total: number
      total_pages: number
    }
  }

  return {
    items: json.data,
    pagination: {
      page: json.pagination.page,
      limit: json.pagination.limit,
      total: json.pagination.total,
      totalPages: json.pagination.total_pages,
    },
  }
}

async function apiFetchBlob(
  path: string,
  init?: ApiFetchInit,
  retriedAfterRefresh = false,
): Promise<Blob> {
  const authHeaders: Record<string, string> = {}
  const token = tokenAccessor?.() ?? readAccessToken()
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(path, init?.query), {
    headers: {
      ...authHeaders,
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const { message, code } = await parseErrorBody(response)

    if (
      !retriedAfterRefresh &&
      response.status === 401 &&
      code === 'INVALID_ACCESS_TOKEN' &&
      shouldAttemptTokenRefresh(path)
    ) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return apiFetchBlob(path, init, true)
      }
      sessionExpiredHandler?.()
    }

    throw new ApiError(message, response.status, code)
  }

  return response.blob()
}



// ---------------------------------------------------------------------------
// HTTP verb wrapper
// ---------------------------------------------------------------------------

export const http = {
  get<T>(path: string, init?: ApiFetchInit) {
    return apiFetch<T>(path, { ...init, method: 'GET' })
  },

  getPaginated<T>(path: string, init?: ApiFetchInit) {
    return apiFetchPaginated<T>(path, { ...init, method: 'GET' })
  },

  post<T>(path: string, body: unknown, init?: ApiFetchInit) {
    return apiFetch<T>(path, {
      ...init,
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  patch<T>(path: string, body: unknown, init?: ApiFetchInit) {
    return apiFetch<T>(path, {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  delete<T>(path: string, init?: ApiFetchInit) {
    return apiFetch<T>(path, { ...init, method: 'DELETE' })
  },

  getBlob(path: string, init?: ApiFetchInit) {
    return apiFetchBlob(path, { ...init, method: 'GET' })
  },
}
