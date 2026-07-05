import type { PoolClient } from "pg";
import {
  getBillingRuleById,
  listDueBillingRules,
  updateBillingRuleNextRunDate,
  type BillingRuleRow,
} from "../../db/billingRules";
import { pool } from "../../db/pool";
import type { ObligationResponse } from "../obligations/format";
import { formatObligation, type PaymentObligationRow } from "../obligations/format";
import {
  advanceMonthlyRunDate,
  billingPeriodFromDate,
  billingReferenceCode,
  isOnOrBefore,
} from "./recurrence";

export interface GenerateObligationsResult {
  rule_id: string;
  due_date: string;
  reference_code: string;
  created: boolean;
  obligation?: ObligationResponse;
}

export interface GenerateDueSummary {
  as_of_date: string;
  results: GenerateObligationsResult[];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function insertObligationFromRule(
  rule: BillingRuleRow,
  dueDate: string,
  referenceCode: string,
  client: PoolClient,
): Promise<{ row: PaymentObligationRow | null; created: boolean }> {
  const billingPeriod = billingPeriodFromDate(dueDate);
  const metadata = {
    ...((typeof rule.metadata === "string"
      ? JSON.parse(rule.metadata)
      : rule.metadata) as Record<string, unknown>),
    billing_period: billingPeriod,
    generated_by: "billing_rule",
  };

  const { rows } = await client.query<PaymentObligationRow>(
    `INSERT INTO payment_obligations (
       business_id,
       customer_id,
       billing_rule_id,
       obligation_type,
       reference_code,
       amount,
       amount_paid,
       due_date,
       status,
       metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'UNPAID', $8::jsonb)
     ON CONFLICT (billing_rule_id, reference_code)
       WHERE billing_rule_id IS NOT NULL AND reference_code IS NOT NULL
     DO NOTHING
     RETURNING *`,
    [
      rule.business_id,
      rule.customer_id,
      rule.id,
      rule.obligation_type,
      referenceCode,
      rule.amount,
      dueDate,
      JSON.stringify(metadata),
    ],
  );

  if (rows[0]) {
    return { row: rows[0], created: true };
  }

  const { rows: existing } = await client.query<PaymentObligationRow>(
    `SELECT *
     FROM payment_obligations
     WHERE billing_rule_id = $1 AND reference_code = $2`,
    [rule.id, referenceCode],
  );

  return { row: existing[0] ?? null, created: false };
}

/**
 * Process all billing periods for one rule up to asOfDate (inclusive).
 * Idempotent per period via unique (billing_rule_id, reference_code).
 */
export async function generateObligationsForRule(
  ruleId: string,
  asOfDate: string = todayIsoDate(),
): Promise<GenerateObligationsResult[]> {
  const results: GenerateObligationsResult[] = [];
  const client = await pool.connect();

  try {
    while (true) {
      await client.query("BEGIN");

      const rule = await getBillingRuleById(ruleId, client);

      if (!rule || !rule.is_active || !isOnOrBefore(asOfDate, rule.next_run_date)) {
        await client.query("ROLLBACK");
        break;
      }

      const dueDate = rule.next_run_date;
      const referenceCode = billingReferenceCode(dueDate);
      const { row, created } = await insertObligationFromRule(
        rule,
        dueDate,
        referenceCode,
        client,
      );

      const dayOfMonth = rule.day_of_month ?? 1;
      const nextRunDate = advanceMonthlyRunDate(dueDate, dayOfMonth);
      await updateBillingRuleNextRunDate(rule.id, nextRunDate, client);

      await client.query("COMMIT");

      results.push({
        rule_id: rule.id,
        due_date: dueDate,
        reference_code: referenceCode,
        created,
        obligation: row ? formatObligation(row) : undefined,
      });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return results;
}

export async function generateDueObligations(
  asOfDate: string = todayIsoDate(),
): Promise<GenerateDueSummary> {
  const dueRules = await listDueBillingRules(asOfDate);
  const results: GenerateObligationsResult[] = [];

  for (const rule of dueRules) {
    const ruleResults = await generateObligationsForRule(rule.id, asOfDate);
    results.push(...ruleResults);
  }

  return { as_of_date: asOfDate, results };
}
