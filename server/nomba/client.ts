import { nombaConfig } from "../config/env";
import { NombaAuthService } from "./auth";
import { NombaHttpClient } from "./httpClient";
import type {
  CreateVirtualAccountInput,
  FetchFn,
  NombaClientConfig,
  VirtualAccount,
} from "./types";
import { NombaVirtualAccountService } from "./virtualAccounts";

export class NombaClient {
  private readonly virtualAccounts: NombaVirtualAccountService;

  constructor(
    private readonly config: NombaClientConfig,
    fetchFn: FetchFn = fetch,
  ) {
    const auth = new NombaAuthService(config, fetchFn);
    const http = new NombaHttpClient(config, auth, fetchFn);
    this.virtualAccounts = new NombaVirtualAccountService(http);
  }

  createCustomerVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<VirtualAccount> {
    return this.virtualAccounts.createVirtualAccount(input);
  }

  getVirtualAccount(identifier: string): Promise<VirtualAccount> {
    return this.virtualAccounts.getVirtualAccount(identifier);
  }

  deactivateVirtualAccount(accountRef: string): Promise<{ expired: boolean }> {
    return this.virtualAccounts.deactivateVirtualAccount(accountRef);
  }
}

export function createNombaClientFromEnv(fetchFn?: FetchFn): NombaClient {
  return new NombaClient(nombaConfig, fetchFn);
}
