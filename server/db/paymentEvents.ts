import type { Pool, PoolClient } from "pg";
import { pool } from "./pool";
import { AppError } from "../lib/AppError";

type DbClient = Pool | PoolClient;

export interface PaymentEventRow {
  id: string;
  business_id: string | null;
  virtual_account_id: string | null;
  idempotency_key: string;
  amount: number;
  sender_name: string | null;
  sender_account: string | null;
  raw_payload: Record<string, unknown>;
  received_at: Date;
  is_matched: boolean;
  created_at: Date;
}

export interface InsertPaymentEventInput {
  transactionId: string;
  transactionAmount: number;
  virtualAccountId?: string | null;
  businessId?: string | null;
  isMatched: boolean;
  senderName?: string | null;
  senderAccount?: string | null;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
}

export async function insertPaymentEvent(
  input: InsertPaymentEventInput,
  client: DbClient = pool,
): Promise<PaymentEventRow> {
  const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1MB
  const serializedPayload = JSON.stringify(input.rawPayload);

  if (Buffer.byteLength(serializedPayload, "utf8") > MAX_PAYLOAD_BYTES) {
    throw new AppError(
      "Payment event payload exceeds maximum allowed size",
      400,
      "PAYLOAD_TOO_LARGE",
    );
  }

  const { rows } = await client.query<PaymentEventRow>(
    `INSERT INTO payment_events (
       business_id,
       virtual_account_id,
       idempotency_key,
       amount,
       sender_name,
       sender_account,
       raw_payload,
       received_at,
       is_matched
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.businessId ?? null,
      input.virtualAccountId ?? null,
      input.transactionId,
      input.transactionAmount,
      input.senderName ?? null,
      input.senderAccount ?? null,
      serializedPayload,
      input.receivedAt,
      input.isMatched,
    ],
  );

  return rows[0];
}
