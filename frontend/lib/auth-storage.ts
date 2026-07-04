export const ACCESS_TOKEN_KEY = 'lc_access_token'
export const REFRESH_TOKEN_KEY = 'lc_refresh_token'

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function storeAuthTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/** Reads the access token — used by the API client on every request. */
export function readAccessToken(): string | null {
  const token = getStoredAccessToken()
  if (!token || token === 'undefined' || token === 'null') return null
  return token
}
