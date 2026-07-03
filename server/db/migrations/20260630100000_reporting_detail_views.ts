import type { Knex } from "knex";

/**
 * Customer ledger history and obligation detail views for reporting APIs.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE VIEW v_customer_ledger_history AS
    SELECT
      le.id AS ledger_entry_id,
      le.customer_id,
      c.business_id,
      le.obligation_id,
      o.reference_code AS obligation_reference_code,
      o.obligation_type,
      le.entry_type,
      le.amount,
      le.balance_after,
      le.description,
      le.created_at,
      le.payment_event_id,
      pe.amount AS payment_amount,
      pe.sender_name,
      pe.received_at AS payment_received_at
    FROM ledger_entries le
    JOIN customers c ON c.id = le.customer_id
    LEFT JOIN payment_obligations o ON o.id = le.obligation_id
    LEFT JOIN payment_events pe ON pe.id = le.payment_event_id;

    CREATE OR REPLACE VIEW v_obligation_detail AS
    SELECT
      o.id AS obligation_id,
      o.business_id,
      o.customer_id,
      c.full_name AS customer_name,
      o.obligation_type,
      o.reference_code,
      o.amount,
      o.amount_paid,
      (o.amount - o.amount_paid)::BIGINT AS outstanding,
      o.due_date,
      o.status,
      o.billing_rule_id,
      o.metadata,
      o.created_at,
      o.updated_at,
      GREATEST(CURRENT_DATE - o.due_date, 0)::INT AS days_overdue,
      CASE
        WHEN o.status = 'PAID' THEN 'paid'
        WHEN o.due_date >= CURRENT_DATE THEN 'current'
        WHEN CURRENT_DATE - o.due_date <= 30 THEN '1_30_days'
        WHEN CURRENT_DATE - o.due_date <= 60 THEN '31_60_days'
        WHEN CURRENT_DATE - o.due_date <= 90 THEN '61_90_days'
        ELSE '90_plus_days'
      END AS aging_bucket
    FROM payment_obligations o
    JOIN customers c ON c.id = o.customer_id;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP VIEW IF EXISTS v_obligation_detail;
    DROP VIEW IF EXISTS v_customer_ledger_history;
  `);
}
