import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import { pool } from "../db/pool";
import { insertBusiness } from "../db/businesses";
import {
  insertBusinessMember,
  listBusinessMembershipsByUser,
} from "../db/businessMembers";

export interface Workspace {
  businessId: string;
  name: string;
  role: string;
}

/**
 * Creates a business/workspace for the given user and links it to the team's
 * shared Nomba sub-account. The creating user is added as the owner. All
 * customers (and their virtual accounts) added under this business will be
 * provisioned against `env.nombaSubAccountId`.
 */
export async function createBusiness(input: {
  userId: string;
  name: string;
}): Promise<Workspace> {
  const businessId = randomUUID();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await insertBusiness(
      {
        id: businessId,
        name: input.name,
        nombaSubAccountId: env.nombaSubAccountId,
      },
      client,
    );

    await insertBusinessMember(
      { businessId, userId: input.userId, role: "owner" },
      client,
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { businessId, name: input.name, role: "owner" };
}

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const memberships = await listBusinessMembershipsByUser(userId);
  return memberships.map((m) => ({
    businessId: m.business_id,
    name: m.business_name,
    role: m.role,
  }));
}
