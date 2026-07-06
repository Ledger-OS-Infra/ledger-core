import { http } from './client'

export interface Workspace {
  businessId: string
  name: string
  role: string
}

export interface RawBusinessNombaAccount {
  sub_account_id: string
  account_name: string
  account_ref: string
  status: string
  currency: 'NGN'
  balance_kobo: number
  balance_as_of: string
  bank_accounts: Array<{
    account_number: string
    bank_name: string
    account_name: string
  }>
}

export interface BusinessNombaAccount {
  subAccountId: string
  accountName: string
  accountRef: string
  status: string
  currency: 'NGN'
  balance: number
  balanceAsOf: string
  bankAccounts: Array<{
    accountNumber: string
    bankName: string
    accountName: string
  }>
}

function normalizeBusinessNombaAccount(
  raw: RawBusinessNombaAccount,
): BusinessNombaAccount {
  return {
    subAccountId: raw.sub_account_id,
    accountName: raw.account_name,
    accountRef: raw.account_ref,
    status: raw.status,
    currency: raw.currency,
    balance: raw.balance_kobo / 100,
    balanceAsOf: raw.balance_as_of,
    bankAccounts: raw.bank_accounts.map((bank) => ({
      accountNumber: bank.account_number,
      bankName: bank.bank_name,
      accountName: bank.account_name,
    })),
  }
}

export const businessClient = {
  list() {
    return http.get<Workspace[]>('/businesses')
  },

  create(input: { name: string }) {
    return http.post<Workspace>('/businesses', { name: input.name })
  },

  getNombaAccount(businessId: string) {
    return http
      .get<RawBusinessNombaAccount>(`/businesses/${businessId}/nomba-account`)
      .then(normalizeBusinessNombaAccount)
  },
}
