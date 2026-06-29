import { AppError } from "../lib/AppError";
import {
  formatObligation,
  type ObligationResponse,
  type PaymentObligationRow,
} from "../lib/obligations/format";
import type { ObligationStatus, ObligationType } from "../lib/obligations/status";
import {
  buildObligationUpdatePatch,
  validateObligationUpdate,
} from "../lib/obligations/update";
import { pool } from "./pool";

export type {
  ObligationResponse,
  PaymentObligationRow,
} from "../lib/obligations/format";

export interface CreateObligationInput {
  customerId: string;
  type: ObligationType;
  amount: number;
  dueDate: string;
  referenceCode?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateObligationInput {
  type?: ObligationType;
  amount?: number;
  dueDate?: string;
  referenceCode?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ListObligationsFilters {
  status?: ObligationStatus;
  type?: ObligationType;
}

async function getCustomerBusinessId(
  customerId: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ business_id: string }>(
    `SELECT business_id FROM customers WHERE id = $1`,
    [customerId],
  );

  return rows[0]?.business_id ?? null;
}

export async function createObligation(
  input: CreateObligationInput,
): Promise<ObligationResponse> {
  const businessId = await getCustomerBusinessId(input.customerId);

  if (!businessId) {
    throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }

  const { rows } = await pool.query<PaymentObligationRow>(
    `INSERT INTO payment_obligations (
       business_id,
       customer_id,
       obligation_type,
       reference_code,
       amount,
       amount_paid,
       due_date,
       status,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, 0, $6, 'UNPAID', $7::jsonb)
     RETURNING *`,
    [
      businessId,
      input.customerId,
      input.type,
      input.referenceCode ?? null,
      input.amount,
      input.dueDate,
      JSON.stringify(input.metadata ?? {}),
    ],
  );

  return formatObligation(rows[0]);
}

export async function listObligationsByCustomer(
  customerId: string,
  filters: ListObligationsFilters = {},
): Promise<ObligationResponse[]> {
  const businessId = await getCustomerBusinessId(customerId);

  if (!businessId) {
    throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }

  const conditions = ["customer_id = $1"];
  const values: Array<string | ObligationType> = [customerId];

  if (filters.type) {
    values.push(filters.type);
    conditions.push(`obligation_type = $${values.length}`);
  }

  const { rows } = await pool.query<PaymentObligationRow>(
    `SELECT *
     FROM payment_obligations
     WHERE ${conditions.join(" AND ")}
     ORDER BY due_date ASC, created_at ASC`,
    values,
  );

  const obligations = rows.map(formatObligation);

  if (!filters.status) {
    return obligations;
  }

  return obligations.filter((obligation) => obligation.status === filters.status);
}

export async function getObligationById(
  obligationId: string,
): Promise<ObligationResponse | null> {
  const { rows } = await pool.query<PaymentObligationRow>(
    `SELECT * FROM payment_obligations WHERE id = $1`,
    [obligationId],
  );

  return rows[0] ? formatObligation(rows[0]) : null;
}

export async function updateObligation(
  obligationId: string,
  input: UpdateObligationInput,
): Promise<ObligationResponse> {
  const { rows: existingRows } = await pool.query<PaymentObligationRow>(
    `SELECT * FROM payment_obligations WHERE id = $1`,
    [obligationId],
  );

  const existing = existingRows[0];

  if (!existing) {
    throw new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND");
  }

  validateObligationUpdate(existing, input);

  const { assignments, values } = buildObligationUpdatePatch(input);

  if (assignments.length === 0) {
    return formatObligation(existing);
  }

  values.push(obligationId);

  const { rows } = await pool.query<PaymentObligationRow>(
    `UPDATE payment_obligations
     SET ${assignments.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values,
  );

  return formatObligation(rows[0]);
}
