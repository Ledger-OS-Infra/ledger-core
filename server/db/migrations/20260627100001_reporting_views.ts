import type { Knex } from "knex";

/**
 * Reporting view stubs — full definitions in issue #4.
 * Amounts are stored in NGN (whole naira).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE VIEW v_customer_balance_summary AS
    SELECT
      c.id AS customer_id,
      c.business_id,
      c.full_name,
      c.email,
      c.status AS customer_status,
      COALESCE(
        SUM(o.amount - o.amount_paid) FILTER (
          WHERE o.status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
        ),
        0
      )::BIGINT AS total_outstanding,
      COALESCE(w.balance, 0)::BIGINT AS wallet_credit,
      (
        COALESCE(
          SUM(o.amount - o.amount_paid) FILTER (
            WHERE o.status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
          ),
          0
        ) - COALESCE(w.balance, 0)
      )::BIGINT AS net_balance
    FROM customers c
    LEFT JOIN payment_obligations o ON o.customer_id = c.id
    LEFT JOIN customer_wallets w ON w.customer_id = c.id
    GROUP BY c.id, c.business_id, c.full_name, c.email, c.status, w.balance;

    CREATE OR REPLACE VIEW v_obligation_aging AS
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
    JOIN customers c ON c.id = o.customer_id
    WHERE o.status IN ('UNPAID', 'PARTIAL', 'OVERDUE');

    CREATE OR REPLACE VIEW v_business_metrics AS
    SELECT
      b.id AS business_id,
      b.name AS business_name,
      COALESCE(inflow.total_inflow, 0)::BIGINT AS total_inflow,
      COALESCE(outstanding.total_outstanding, 0)::BIGINT AS total_outstanding,
      COALESCE(outstanding.overdue_count, 0)::INT AS overdue_obligation_count,
      COALESCE(outstanding.overdue_amount, 0)::BIGINT AS overdue_amount,
      COALESCE(wallet.total_wallet_credit, 0)::BIGINT AS total_wallet_credit
    FROM businesses b
    LEFT JOIN (
      SELECT business_id, SUM(amount)::BIGINT AS total_inflow
      FROM payment_events
      GROUP BY business_id
    ) inflow ON inflow.business_id = b.id
    LEFT JOIN (
      SELECT
        business_id,
        SUM(amount - amount_paid)::BIGINT AS total_outstanding,
        COUNT(*) FILTER (WHERE status = 'OVERDUE')::INT AS overdue_count,
        SUM(amount - amount_paid) FILTER (WHERE status = 'OVERDUE')::BIGINT AS overdue_amount
      FROM payment_obligations
      WHERE status IN ('UNPAID', 'PARTIAL', 'OVERDUE')
      GROUP BY business_id
    ) outstanding ON outstanding.business_id = b.id
    LEFT JOIN (
      SELECT c.business_id, SUM(w.balance)::BIGINT AS total_wallet_credit
      FROM customer_wallets w
      JOIN customers c ON c.id = w.customer_id
      GROUP BY c.business_id
    ) wallet ON wallet.business_id = b.id;

    CREATE OR REPLACE VIEW v_obligation_payment_history AS
    SELECT
      o.id AS obligation_id,
      o.business_id,
      o.customer_id,
      o.obligation_type,
      o.reference_code,
      o.amount AS obligation_amount,
      o.amount_paid,
      o.status AS obligation_status,
      le.id AS ledger_entry_id,
      le.entry_type,
      le.amount AS allocation_amount,
      le.balance_after,
      le.description,
      le.created_at AS allocated_at,
      pe.id AS payment_event_id,
      pe.amount AS payment_amount,
      pe.sender_name,
      pe.received_at AS payment_received_at
    FROM payment_obligations o
    LEFT JOIN ledger_entries le ON le.obligation_id = o.id
    LEFT JOIN payment_events pe ON pe.id = le.payment_event_id
    ORDER BY o.id, le.created_at;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP VIEW IF EXISTS v_obligation_payment_history;
    DROP VIEW IF EXISTS v_business_metrics;
    DROP VIEW IF EXISTS v_obligation_aging;
    DROP VIEW IF EXISTS v_customer_balance_summary;
  `);
}
