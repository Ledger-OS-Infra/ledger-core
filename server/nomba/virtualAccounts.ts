import type { NombaHttpClient } from "./httpClient";
import type { CreateVirtualAccountInput, VirtualAccount } from "./types";

export class NombaVirtualAccountService {
  constructor(
    private readonly http: NombaHttpClient,
    private readonly subAccountId: string,
    private readonly scopeToSubAccount: boolean,
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

    const path = this.scopeToSubAccount
      ? `/v1/accounts/virtual/${encodeURIComponent(this.subAccountId)}`
      : "/v1/accounts/virtual";

    // Live: sub-account VA so accountHolderId matches webhook redirect lookup.
    // Sandbox: parent endpoint (sub-account path fails on sandbox.nomba.com).
    return this.http.post<VirtualAccount>(path, body);
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
