import type { PaginationMeta, QueryParams } from './types'
import { readAccessToken } from '@/lib/auth-storage'

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function currentOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3050'
}

function buildUrl(path: string, query?: QueryParams): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ?? currentOrigin()
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

export function setTokenAccessor(fn: () => string | null) {
  tokenAccessor = fn
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

async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
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
    let message = `API request failed [${response.status}]`
    let code: string | undefined
    try {
      const body = await response.json() as { error?: { message?: string; code?: string } }
      message = body.error?.message ?? message
      code = body.error?.code
    } catch {
      // body wasn't JSON
    }
    throw new ApiError(message, response.status, code)
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

async function apiFetchPaginated<T>(
  path: string,
  init?: ApiFetchInit,
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
    let message = `API request failed [${response.status}]`
    let code: string | undefined
    try {
      const body = await response.json() as { error?: { message?: string; code?: string } }
      message = body.error?.message ?? message
      code = body.error?.code
    } catch {
      // body wasn't JSON
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
}
