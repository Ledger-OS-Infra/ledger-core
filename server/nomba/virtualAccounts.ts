import type { NombaHttpClient } from "./httpClient";
import type { CreateVirtualAccountInput, VirtualAccount } from "./types";

export class NombaVirtualAccountService {
  constructor(private readonly http: NombaHttpClient) {}

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

    // Parent account VA — documented for sandbox; funds settle under parent accountId header.
    return this.http.post<VirtualAccount>("/v1/accounts/virtual", body);
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
