import type { PoolClient } from "pg";
import { pool } from "./pool";

export type BusinessMemberRole = "owner" | "admin" | "viewer";

export interface BusinessMemberRow {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessMemberRole;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessMemberWithName extends BusinessMemberRow {
  business_name: string;
}

export async function insertBusinessMember(
  input: {
    businessId: string;
    userId: string;
    role: BusinessMemberRole;
  },
  client?: PoolClient,
): Promise<BusinessMemberRow> {
  const conn = client ?? pool;
  const { rows } = await conn.query<BusinessMemberRow>(
    `INSERT INTO business_members (business_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.businessId, input.userId, input.role],
  );
  return rows[0];
}

export async function listBusinessMembershipsByUser(
  userId: string,
): Promise<BusinessMemberWithName[]> {
  const { rows } = await pool.query<BusinessMemberWithName>(
    `SELECT bm.*, b.name AS business_name
     FROM business_members bm
     JOIN businesses b ON b.id = bm.business_id
     WHERE bm.user_id = $1
     ORDER BY bm.joined_at`,
    [userId],
  );
  return rows;
}
