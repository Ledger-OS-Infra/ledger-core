import { randomUUID } from "node:crypto";
import { AppError } from "../lib/AppError";
import { logger } from "../lib/logger";
import { pool } from "../db/pool";
import bcrypt from "bcrypt";
import {
  businessExists,
  getCustomerById,
  insertCustomer,
  insertCustomerWallet,
  type CustomerWithVirtualAccount,
  type CreateCustomerInput,
} from "../db/customers";
import { getBusinessById } from "../db/businesses";
import { sendCustomerWelcomeEmail } from "../lib/email";

const BCRYPT_ROUNDS = 12;

export interface CreateCustomerRequest {
  businessId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  password: string;
  metadata?: Record<string, unknown>;
}

export class CustomerService {
  async createCustomer(
    input: CreateCustomerRequest,
  ): Promise<CustomerWithVirtualAccount> {
    if (!(await businessExists(input.businessId))) {
      throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
    }

    const customerId = randomUUID();
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const customerInput: CreateCustomerInput = {
        id: customerId,
        businessId: input.businessId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        passwordHash,
        metadata: input.metadata,
      };

      await insertCustomer(customerInput, client);
      await insertCustomerWallet(customerId, client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
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

    try {
      const business = await getBusinessById(input.businessId);
      await sendCustomerWelcomeEmail(
        input.email,
        input.fullName,
        input.password,
        business?.name ?? "Ledger-Core",
      );
    } catch (err) {
      logger.error({ err, customerId }, "Failed to send customer welcome email");
    }

    return created;
  }
}

let defaultService: CustomerService | null = null;

export function getCustomerService(): CustomerService {
  if (!defaultService) {
    defaultService = new CustomerService();
  }
  return defaultService;
}

export function createCustomerService(): CustomerService {
  return new CustomerService();
}
