import type { PoolClient } from "pg";
import { pool } from "./pool";

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

export async function insertRefreshToken(
  input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  },
  client?: PoolClient,
): Promise<RefreshTokenRow> {
  const conn = client ?? pool;
  const { rows } = await conn.query<RefreshTokenRow>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.userId, input.tokenHash, input.expiresAt],
  );
  return rows[0];
}

export async function findValidRefreshToken(
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  const { rows } = await pool.query<RefreshTokenRow>(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1
       AND revoked_at IS NULL
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function revokeRefreshToken(
  tokenId: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
    [tokenId],
  );
}

export async function revokeAllRefreshTokens(
  userId: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}
