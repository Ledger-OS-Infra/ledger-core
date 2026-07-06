export interface NombaApiResponse<T> {
  code: string;
  description?: string;
  message?: string;
  data?: T;
}

export interface AuthTokenData {
  businessId: string;
  access_token: string;
  refresh_token: string;
  expiresAt: string;
}

export interface CreateVirtualAccountInput {
  accountRef: string;
  accountName: string;
  currency?: "NGN";
  bvn?: string;
  expiryDate?: string;
  expectedAmount?: number;
}

export interface VirtualAccount {
  createdAt: string;
  accountHolderId: string;
  accountRef: string;
  bvn?: string;
  accountName: string;
  currency: "NGN";
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  callbackUrl?: string;
  expired?: boolean;
  expiryDate?: string;
}

export interface NombaBankAccount {
  bankAccountNumber: string;
  bankName: string;
  bankAccountName: string;
}

export interface NombaAccountDetails {
  createdAt: string;
  accountId: string;
  accountHolderId: string;
  accountRef: string;
  bvn?: string;
  status: string;
  type?: string;
  accountName: string;
  currency: "NGN";
  banks: NombaBankAccount[];
}

/** Nomba returns balance `amount` as a decimal NGN string (e.g. `"281946.0"`). */
export interface NombaAccountBalance {
  amount: string;
  currency: "NGN";
  timeCreated: string;
}

export interface NombaClientConfig {
  baseUrl: string;
  parentAccountId: string;
  subAccountId: string;
  clientId: string;
  clientSecret: string;
}

export type FetchFn = typeof fetch;
