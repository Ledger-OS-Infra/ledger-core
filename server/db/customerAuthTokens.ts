import type { PoolClient } from "pg";
import { pool } from "./pool";
import { hashToken } from "./authTokens";

export { hashToken };

export interface CustomerAuthTokenRow {
  id: string;
  customer_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export async function insertCustomerAuthToken(
  input: { customerId: string; tokenHash: string; expiresAt: Date },
  client?: PoolClient,
): Promise<CustomerAuthTokenRow> {
  const conn = client ?? pool;
  const { rows } = await conn.query<CustomerAuthTokenRow>(
    `INSERT INTO customer_auth_tokens (customer_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.customerId, input.tokenHash, input.expiresAt],
  );
  return rows[0];
}

export async function invalidateCustomerAuthTokens(
  customerId: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(
    `UPDATE customer_auth_tokens SET used_at = NOW() WHERE customer_id = $1 AND used_at IS NULL`,
    [customerId],
  );
}

export async function findValidCustomerAuthToken(
  tokenHash: string,
): Promise<CustomerAuthTokenRow | null> {
  const { rows } = await pool.query<CustomerAuthTokenRow>(
    `SELECT * FROM customer_auth_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function markCustomerAuthTokenUsed(
  tokenId: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(`UPDATE customer_auth_tokens SET used_at = NOW() WHERE id = $1`, [tokenId]);
}