import { randomUUID } from "node:crypto";
import { pool } from "../../db/pool";

export async function waitFor(
  predicate: () => Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const { timeoutMs = 15_000, intervalMs = 250 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for condition");
}

export async function seedCustomerWithVirtualAccount(input: {
  businessId: string;
  fullName: string;
  accountNumber: string;
  accountRef?: string;
}): Promise<{ customerId: string; virtualAccountId: string }> {
  const customerId = randomUUID();
  const virtualAccountId = randomUUID();
  const accountRef = input.accountRef ?? `ci_${customerId.replace(/-/g, "")}`;

  await pool.query(
    `INSERT INTO customers (id, business_id, full_name, email, status, metadata)
     VALUES ($1, $2, $3, $4, 'ACTIVE', '{}'::jsonb)`,
    [customerId, input.businessId, input.fullName, `ci-${customerId}@test.local`],
  );

  await pool.query(
    `INSERT INTO virtual_accounts (
       id, customer_id, account_ref, account_number, bank_name, bank_code, is_active
     )
     VALUES ($1, $2, $3, $4, 'Test Bank', '090645', TRUE)`,
    [virtualAccountId, customerId, accountRef, input.accountNumber],
  );

  await pool.query(
    `INSERT INTO customer_wallets (customer_id, balance) VALUES ($1, 0)`,
    [customerId],
  );

  return { customerId, virtualAccountId };
}
