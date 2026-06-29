import { NombaAuthError, isRetryableNombaError, mapNombaHttpError } from "./errors";
import type { NombaAuthService } from "./auth";
import type { FetchFn, NombaApiResponse, NombaClientConfig } from "./types";

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 200;

export class NombaHttpClient {
  constructor(
    private readonly config: NombaClientConfig,
    private readonly auth: NombaAuthService,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    attempt = 0,
    retriedAuth = false,
  ): Promise<T> {
    try {
      const accessToken = await this.auth.getAccessToken();
      const response = await this.fetchFn(`${this.config.baseUrl}${path}`, {
        ...init,
        headers: {
          accountId: this.config.parentAccountId,
          Authorization: `Bearer ${accessToken}`,
          ...(init.headers ?? {}),
        },
      });

      const body = (await response.json()) as NombaApiResponse<T>;

      if (response.status === 401 && !retriedAuth) {
        this.auth.invalidate();
        return this.request<T>(path, init, attempt, true);
      }

      if (
        body.code !== "00" ||
        response.status === 400 ||
        response.status >= 401
      ) {
        throw mapNombaHttpError(
          response.status,
          body.code,
          body.description ?? body.message,
        );
      }

      if (body.data === undefined) {
        throw new NombaAuthError("Nomba response missing data", response.status);
      }

      return body.data;
    } catch (error) {
      if (
        error instanceof NombaAuthError &&
        !retriedAuth &&
        attempt < MAX_RETRIES
      ) {
        this.auth.invalidate();
        return this.request<T>(path, init, attempt + 1, true);
      }

      if (isRetryableNombaError(error) && attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_BASE_MS * 2 ** attempt);
        return this.request<T>(path, init, attempt + 1, retriedAuth);
      }

      throw error;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
