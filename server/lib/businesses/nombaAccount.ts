import { nombaNgnStringToKobo } from "../nomba/amount";
import type { NombaAccountBalance, NombaAccountDetails } from "../../nomba/types";

export interface BusinessNombaAccountView {
  sub_account_id: string;
  account_name: string;
  account_ref: string;
  status: string;
  currency: "NGN";
  balance_kobo: number;
  balance_as_of: string;
  bank_accounts: Array<{
    account_number: string;
    bank_name: string;
    account_name: string;
  }>;
}

export function formatBusinessNombaAccount(input: {
  subAccountId: string;
  details: NombaAccountDetails;
  balance: NombaAccountBalance;
}): BusinessNombaAccountView {
  return {
    sub_account_id: input.subAccountId,
    account_name: input.details.accountName,
    account_ref: input.details.accountRef,
    status: input.details.status,
    currency: input.details.currency,
    balance_kobo: nombaNgnStringToKobo(input.balance.amount),
    balance_as_of: input.balance.timeCreated,
    bank_accounts: input.details.banks.map((bank) => ({
      account_number: bank.bankAccountNumber,
      bank_name: bank.bankName,
      account_name: bank.bankAccountName,
    })),
  };
}
