import type { QueryParams } from './types'

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

function currentOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
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
// Core fetch wrapper
// ---------------------------------------------------------------------------

type ApiFetchInit = RequestInit & { query?: QueryParams }

async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const response = await fetch(buildUrl(path, init?.query), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`API request failed [${response.status}] ${response.statusText}: ${body}`)
  }

  const json = (await response.json()) as { data: T }
  return json.data
}

// ---------------------------------------------------------------------------
// HTTP verb wrapper
// ---------------------------------------------------------------------------

export const http = {
  get<T>(path: string, init?: ApiFetchInit) {
    return apiFetch<T>(path, { ...init, method: 'GET' })
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
