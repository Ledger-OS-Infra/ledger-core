import type { NombaHttpClient } from "./httpClient";
import type { CreateVirtualAccountInput, VirtualAccount } from "./types";

export class NombaVirtualAccountService {
  constructor(
    private readonly http: NombaHttpClient,
    private readonly subAccountId: string,
  ) {}

  createVirtualAccount(input: CreateVirtualAccountInput): Promise<VirtualAccount> {
    const body = {
      accountRef: input.accountRef,
      accountName: input.accountName,
      currency: input.currency ?? "NGN",
      ...(input.bvn !== undefined ? { bvn: input.bvn } : {}),
      ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
      ...(input.expectedAmount !== undefined
        ? { expectedAmount: input.expectedAmount }
        : {}),
    };

    // Sub-account VA — accountHolderId scopes to sub-account so Nomba's webhook
    // redirect lookup finds the URL registered for the sub-account (hackathon form).
    // Header accountId stays parent; path uses subAccountId per Nomba docs.
    return this.http.post<VirtualAccount>(
      `/v1/accounts/virtual/${encodeURIComponent(this.subAccountId)}`,
      body,
    );
  }

  getVirtualAccount(identifier: string): Promise<VirtualAccount> {
    return this.http.get<VirtualAccount>(
      `/v1/accounts/virtual/${encodeURIComponent(identifier)}`,
    );
  }

  deactivateVirtualAccount(identifier: string): Promise<{ expired: boolean }> {
    return this.http.delete<{ expired: boolean }>(
      `/v1/accounts/virtual/${encodeURIComponent(identifier)}`,
    );
  }
}
