import type { PoolClient } from "pg";
import { pool } from "./pool";

export interface BusinessRow {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function insertBusiness(
  input: {
    id: string;
    name: string;
  },
  client?: PoolClient,
): Promise<BusinessRow> {
  const conn = client ?? pool;
  const { rows } = await conn.query<BusinessRow>(
    `INSERT INTO businesses (id, name)
     VALUES ($1, $2)
     RETURNING *`,
    [input.id, input.name],
  );
  return rows[0];
}

export async function getBusinessById(id: string): Promise<BusinessRow | null> {
  const { rows } = await pool.query<BusinessRow>(
    `SELECT * FROM businesses WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
