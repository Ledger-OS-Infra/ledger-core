import type { NombaHttpClient } from "./httpClient";
import type { NombaAccountBalance, NombaAccountDetails } from "./types";

export class NombaAccountsService {
  constructor(private readonly http: NombaHttpClient) {}

  getSubAccountDetails(subAccountId: string): Promise<NombaAccountDetails> {
    const query = new URLSearchParams({ accountId: subAccountId });
    return this.http.get<NombaAccountDetails>(
      `/v1/accounts/sub-account-details?${query}`,
    );
  }

  getSubAccountBalance(subAccountId: string): Promise<NombaAccountBalance> {
    return this.http.get<NombaAccountBalance>(
      `/v1/accounts/${encodeURIComponent(subAccountId)}/balance`,
    );
  }
}
