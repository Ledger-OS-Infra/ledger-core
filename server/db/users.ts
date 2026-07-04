import type { PoolClient } from "pg";
import { pool } from "./pool";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  status: "active" | "suspended";
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsertUserInput {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
}

export async function insertUser(
  input: InsertUserInput,
  client?: PoolClient,
): Promise<UserRow> {
  const conn = client ?? pool;
  const { rows } = await conn.query<UserRow>(
    `INSERT INTO users (id, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.id, input.email, input.passwordHash, input.fullName],
  );
  return rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT * FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    `SELECT * FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function markEmailVerified(
  userId: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(
    `UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId],
  );
}

export async function updatePasswordHash(
  userId: string,
  newHash: string,
  client?: PoolClient,
): Promise<void> {
  const conn = client ?? pool;
  await conn.query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [newHash, userId],
  );
}
