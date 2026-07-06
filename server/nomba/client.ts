import { nombaConfig, nombaSandboxConfig } from "../config/nombaEnv";
import { NombaAuthService } from "./auth";
import { NombaHttpClient } from "./httpClient";
import type {
  CreateVirtualAccountInput,
  FetchFn,
  NombaAccountBalance,
  NombaAccountDetails,
  NombaClientConfig,
  VirtualAccount,
} from "./types";
import { NombaAccountsService } from "./accounts";
import { NombaVirtualAccountService } from "./virtualAccounts";

export class NombaClient {
  private readonly virtualAccounts: NombaVirtualAccountService;
  private readonly accounts: NombaAccountsService;

  constructor(
    private readonly config: NombaClientConfig,
    fetchFn: FetchFn = fetch,
  ) {
    const auth = new NombaAuthService(config, fetchFn);
    const http = new NombaHttpClient(config, auth, fetchFn);
    this.virtualAccounts = new NombaVirtualAccountService(http);
    this.accounts = new NombaAccountsService(http);
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

  getSubAccountDetails(subAccountId: string): Promise<NombaAccountDetails> {
    return this.accounts.getSubAccountDetails(subAccountId);
  }

  getSubAccountBalance(subAccountId: string): Promise<NombaAccountBalance> {
    return this.accounts.getSubAccountBalance(subAccountId);
  }
}

export function createNombaClientFromEnv(fetchFn?: FetchFn): NombaClient {
  return new NombaClient(nombaConfig, fetchFn);
}

/** Always uses NOMBA_SANDBOX_* — for CI smoke tests while the app runs on live. */
export function createNombaSandboxClient(fetchFn?: FetchFn): NombaClient {
  return new NombaClient(nombaSandboxConfig, fetchFn);
}
