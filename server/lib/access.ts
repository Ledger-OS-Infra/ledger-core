import { getBusinessMembership, canWriteBusiness, type BusinessMemberRole } from "../db/businessMembers";
import { pool } from "../db/pool";
import { AppError } from "./AppError";

export async function assertBusinessMember(
  userId: string,
  businessId: string,
): Promise<BusinessMemberRole> {
  const membership = await getBusinessMembership(userId, businessId);

  if (!membership) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  return membership.role;
}

export async function assertBusinessWriteAccess(
  userId: string,
  businessId: string,
): Promise<BusinessMemberRole> {
  const role = await assertBusinessMember(userId, businessId);

  if (!canWriteBusiness(role)) {
    throw new AppError("Insufficient permissions", 403, "FORBIDDEN");
  }

  return role;
}

async function lookupCustomerBusinessId(
  customerId: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ business_id: string }>(
    `SELECT business_id FROM customers WHERE id = $1`,
    [customerId],
  );
  return rows[0]?.business_id ?? null;
}

async function lookupObligationBusinessId(
  obligationId: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ business_id: string }>(
    `SELECT business_id FROM payment_obligations WHERE id = $1`,
    [obligationId],
  );
  return rows[0]?.business_id ?? null;
}

async function lookupBillingRuleBusinessId(
  ruleId: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ business_id: string }>(
    `SELECT business_id FROM billing_rules WHERE id = $1`,
    [ruleId],
  );
  return rows[0]?.business_id ?? null;
}

export async function assertCustomerAccess(
  userId: string,
  customerId: string,
  write = false,
): Promise<BusinessMemberRole> {
  const businessId = await lookupCustomerBusinessId(customerId);

  if (!businessId) {
    throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
  }

  if (write) {
    return assertBusinessWriteAccess(userId, businessId);
  }

  return assertBusinessMember(userId, businessId);
}

export async function assertObligationAccess(
  userId: string,
  obligationId: string,
  write = false,
): Promise<BusinessMemberRole> {
  const businessId = await lookupObligationBusinessId(obligationId);

  if (!businessId) {
    throw new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND");
  }

  if (write) {
    return assertBusinessWriteAccess(userId, businessId);
  }

  return assertBusinessMember(userId, businessId);
}

export async function assertBillingRuleAccess(
  userId: string,
  ruleId: string,
  write = false,
): Promise<BusinessMemberRole> {
  const businessId = await lookupBillingRuleBusinessId(ruleId);

  if (!businessId) {
    throw new AppError("Billing rule not found", 404, "BILLING_RULE_NOT_FOUND");
  }

  if (write) {
    return assertBusinessWriteAccess(userId, businessId);
  }

  return assertBusinessMember(userId, businessId);
}
