import type { AuthTokenData, FetchFn, NombaApiResponse, NombaClientConfig } from "./types";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class NombaAuthService {
  private cache: TokenCache | null = null;

  constructor(
    private readonly config: NombaClientConfig,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cache && !this.checkExpiry(this.cache.expiresAt)) {
      return this.cache.accessToken;
    }

    if (this.cache?.refreshToken) {
      try {
        await this.refreshAccessToken(this.cache.refreshToken);
        return this.cache!.accessToken;
      } catch {
        this.cache = null;
      }
    }

    await this.generateAccessToken();
    return this.cache!.accessToken;
  }

  invalidate(): void {
    this.cache = null;
  }

  private checkExpiry(expiresAt: Date): boolean {
    return expiresAt.getTime() - Date.now() <= TOKEN_REFRESH_BUFFER_MS;
  }

  private async generateAccessToken(): Promise<void> {
    const response = await this.fetchFn(
      `${this.config.baseUrl}/v1/auth/token/issue`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accountId: this.config.parentAccountId,
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      },
    );

    const body = (await response.json()) as NombaApiResponse<AuthTokenData>;
    this.authSuccess(response.status, body);
    this.cache = this.toTokenCache(body.data!);
  }

  private async refreshAccessToken(refreshToken: string): Promise<void> {
    const response = await this.fetchFn(
      `${this.config.baseUrl}/v1/auth/token/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accountId: this.config.parentAccountId,
          ...(this.cache?.accessToken
            ? { Authorization: `Bearer ${this.cache.accessToken}` }
            : {}),
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
    );

    const body = (await response.json()) as NombaApiResponse<AuthTokenData>;
    this.authSuccess(response.status, body);
    this.cache = this.toTokenCache(body.data!);
  }

  private authSuccess(
    status: number,
    body: NombaApiResponse<AuthTokenData>,
  ): void {
    if (body.code !== "00" || status >= 401 || !body.data?.access_token) {
      throw new Error(body.description ?? "Nomba authentication failed");
    }
  }

  private toTokenCache(data: AuthTokenData): TokenCache {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expiresAt),
    };
  }
}
