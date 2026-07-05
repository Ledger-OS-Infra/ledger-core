import type { PoolClient } from "pg";
import { AppError } from "../lib/AppError";
import type { ObligationType } from "../lib/obligations/status";
import { pool } from "./pool";

export type BillingRecurrence = "MONTHLY";

export interface BillingRuleRow {
  id: string;
  business_id: string;
  customer_id: string;
  obligation_type: ObligationType;
  amount: string;
  recurrence: BillingRecurrence;
  day_of_month: number | null;
  next_run_date: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBillingRuleInput {
  customerId: string;
  obligationType: ObligationType;
  amount: number;
  recurrence: BillingRecurrence;
  dayOfMonth: number;
  startDate: string;
  metadata?: Record<string, unknown>;
}

export interface BillingRuleResponse {
  id: string;
  customer_id: string;
  business_id: string;
  obligation_type: ObligationType;
  amount: number;
  recurrence: BillingRecurrence;
  day_of_month: number;
  next_run_date: string;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BillingRuleWithCustomerName extends BillingRuleResponse {
  customer_name: string;
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    return JSON.parse(value) as Record<string, unknown>;
  }
  return (value ?? {}) as Record<string, unknown>;
}

export function formatBillingRule(row: BillingRuleRow): BillingRuleResponse {
  return {
    id: row.id,
    customer_id: row.customer_id,
    business_id: row.business_id,
    obligation_type: row.obligation_type,
    amount: Number(row.amount),
    recurrence: row.recurrence,
    day_of_month: row.day_of_month ?? 1,
    next_run_date: row.next_run_date,
    is_active: row.is_active,
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

async function getCustomerBusinessId(
  customerId: string,
  client: typeof pool | PoolClient = pool,
): Promise<string | null> {
  const { rows } = await client.query<{ business_id: string }>(
    `SELECT business_id FROM customers WHERE id = $1`,
    [customerId],
  );
  return rows[0]?.business_id ?? null;
}

export async function createBillingRule(
  input: CreateBillingRuleInput,
): Promise<BillingRuleResponse> {
  const businessId = await getCustomerBusinessId(input.customerId);

  if (!businessId) {
    throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }

  if (input.recurrence !== "MONTHLY") {
    throw new AppError(
      "Only MONTHLY recurrence is supported",
      400,
      "UNSUPPORTED_RECURRENCE",
    );
  }

  const { rows } = await pool.query<BillingRuleRow>(
    `INSERT INTO billing_rules (
       business_id,
       customer_id,
       obligation_type,
       amount,
       recurrence,
       day_of_month,
       next_run_date,
       is_active,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8::jsonb)
     RETURNING *`,
    [
      businessId,
      input.customerId,
      input.obligationType,
      input.amount,
      input.recurrence,
      input.dayOfMonth,
      input.startDate,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return formatBillingRule(rows[0]);
}

export async function listBillingRulesByCustomer(
  customerId: string,
): Promise<BillingRuleResponse[]> {
  const { rows } = await pool.query<BillingRuleRow>(
    `SELECT * FROM billing_rules
     WHERE customer_id = $1
     ORDER BY created_at ASC`,
    [customerId],
  );

  return rows.map(formatBillingRule);
}

export async function listBillingRulesByBusiness(
  businessId: string,
): Promise<BillingRuleWithCustomerName[]> {
  const { rows } = await pool.query<
    BillingRuleRow & { customer_name: string }
  >(
    `SELECT br.*, c.full_name AS customer_name
     FROM billing_rules br
     JOIN customers c ON c.id = br.customer_id
     WHERE br.business_id = $1
     ORDER BY br.next_run_date ASC, br.created_at ASC`,
    [businessId],
  );

  return rows.map((row) => ({
    ...formatBillingRule(row),
    customer_name: row.customer_name,
  }));
}

export async function getBillingRuleById(
  ruleId: string,
  client: typeof pool | PoolClient = pool,
): Promise<BillingRuleRow | null> {
  const { rows } = await client.query<BillingRuleRow>(
    `SELECT * FROM billing_rules WHERE id = $1`,
    [ruleId],
  );
  return rows[0] ?? null;
}

export async function listDueBillingRules(
  asOfDate: string,
  client: typeof pool | PoolClient = pool,
): Promise<BillingRuleRow[]> {
  const { rows } = await client.query<BillingRuleRow>(
    `SELECT *
     FROM billing_rules
     WHERE is_active = TRUE
       AND next_run_date <= $1
     ORDER BY next_run_date ASC, created_at ASC`,
    [asOfDate],
  );
  return rows;
}

export async function updateBillingRuleNextRunDate(
  ruleId: string,
  nextRunDate: string,
  client: PoolClient,
): Promise<void> {
  await client.query(
    `UPDATE billing_rules
     SET next_run_date = $1, updated_at = NOW()
     WHERE id = $2`,
    [nextRunDate, ruleId],
  );
}
