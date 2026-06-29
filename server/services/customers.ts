import { randomUUID } from "node:crypto";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";
import { pool } from "../db/pool";
import {
  businessExists,
  getCustomerById,
  insertCustomer,
  insertCustomerWallet,
  insertVirtualAccount,
  type CustomerWithVirtualAccount,
  type CreateCustomerInput,
} from "../db/customers";
import type { NombaClient } from "../nomba/client";
import { createNombaClientFromEnv } from "../nomba/client";
import { NombaApiError } from "../nomba/errors";
import type { VirtualAccount } from "../nomba/types";

export interface CreateCustomerRequest {
  businessId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}

function nombaAccountRefForCustomer(customerId: string): string {
  return `lc_${customerId.replace(/-/g, "")}`;
}

function mapNombaVirtualAccount(
  nombaAccount: VirtualAccount,
): {
  nombaAccountRef: string;
  accountNumber: string;
  bankName: string;
} {
  const accountNumber = nombaAccount.bankAccountNumber?.trim();
  const bankName = nombaAccount.bankName?.trim();

  if (!accountNumber || !bankName) {
    throw new AppError(
      "Nomba did not return complete virtual account bank details",
      502,
      "NOMBA_INCOMPLETE_VA_RESPONSE",
    );
  }

  return {
    nombaAccountRef: nombaAccount.accountRef,
    accountNumber,
    bankName,
  };
}

function mapNombaError(error: unknown): AppError {
  if (error instanceof NombaApiError) {
    return new AppError(
      error.description ?? error.message,
      502,
      "NOMBA_API_ERROR",
    );
  }

  if (error instanceof AppError) {
    return error;
  }

  throw error;
}

async function compensateOrphanedVirtualAccount(
  nomba: NombaClient,
  accountRef: string,
): Promise<void> {
  try {
    await nomba.deactivateVirtualAccount(accountRef);
    logger.warn(
      { accountRef },
      "Expired orphaned Nomba virtual account after DB rollback",
    );
  } catch (compensationError) {
    logger.error(
      { accountRef, err: compensationError },
      "Failed to expire orphaned Nomba virtual account — manual cleanup required",
    );
  }
}

export class CustomerService {
  constructor(private readonly nomba: NombaClient) {}

  async createCustomer(
    input: CreateCustomerRequest,
  ): Promise<CustomerWithVirtualAccount> {
    if (!(await businessExists(input.businessId))) {
      throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
    }

    const customerId = randomUUID();
    const accountRef = nombaAccountRefForCustomer(customerId);
    const client = await pool.connect();
    let provisionedAccountRef: string | null = null;

    try {
      await client.query("BEGIN");

      const customerInput: CreateCustomerInput = {
        id: customerId,
        businessId: input.businessId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        metadata: input.metadata,
      };

      await insertCustomer(customerInput, client);

      let nombaAccount: VirtualAccount;
      try {
        nombaAccount = await this.nomba.createCustomerVirtualAccount({
          accountRef,
          accountName: input.fullName,
        });
      } catch (error) {
        throw mapNombaError(error);
      }

      const vaDetails = mapNombaVirtualAccount(nombaAccount);
      provisionedAccountRef = vaDetails.nombaAccountRef;

      await insertVirtualAccount(
        {
          id: randomUUID(),
          customerId,
          nombaAccountRef: vaDetails.nombaAccountRef,
          accountNumber: vaDetails.accountNumber,
          bankName: vaDetails.bankName,
        },
        client,
      );
      await insertCustomerWallet(customerId, client);

      await client.query("COMMIT");
      provisionedAccountRef = null;
    } catch (error) {
      await client.query("ROLLBACK");

      if (provisionedAccountRef) {
        await compensateOrphanedVirtualAccount(this.nomba, provisionedAccountRef);
      }

      throw error;
    } finally {
      client.release();
    }

    const created = await getCustomerById(customerId);
    if (!created) {
      throw new AppError(
        "Customer was created but could not be loaded",
        500,
        "CUSTOMER_LOAD_FAILED",
      );
    }

    return created;
  }
}

let defaultService: CustomerService | null = null;

export function getCustomerService(): CustomerService {
  if (!defaultService) {
    defaultService = new CustomerService(createNombaClientFromEnv());
  }
  return defaultService;
}

/** Test hook — inject mocks without touching module-level singleton in tests. */
export function createCustomerService(nomba: NombaClient): CustomerService {
  return new CustomerService(nomba);
}
