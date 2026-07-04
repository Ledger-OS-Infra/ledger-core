import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "./pool";

export type AuthTokenType = "email_verify" | "password_reset";

export interface AuthTokenRow {
  id: string;
  user_id: string;
  type: AuthTokenType;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function insertAuthToken(
  input: {
    userId: string;
    type: AuthTokenType;
    tokenHash: string;
    expiresAt: Date;
  },
  client?: PoolClient,
): Promise<AuthTokenRow> {
  const conn = client ?? pool;
  const { rows } = await conn.query<AuthTokenRow>(
    `INSERT INTO auth_tokens (user_id, type, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.userId, input.type, input.tokenHash, input.expiresAt],
  );
  return rows[0];
}

export async function invalidateTokensByUserAndType(
  userId: string,
  type: AuthTokenType,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(
    `UPDATE auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = $2 AND used_at IS NULL`,
    [userId, type],
  );
}

export async function findValidAuthToken(
  tokenHash: string,
  type: AuthTokenType,
): Promise<AuthTokenRow | null> {
  const { rows } = await pool.query<AuthTokenRow>(
    `SELECT * FROM auth_tokens
     WHERE token_hash = $1
       AND type = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash, type],
  );
  return rows[0] ?? null;
}

export async function markTokenUsed(
  tokenId: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(
    `UPDATE auth_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenId],
  );
}
