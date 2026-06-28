import type { Knex } from "knex";

/**
 * Refines reporting views: removes non-portable ORDER BY from payment history,
 * adds aging summary aggregation for dashboard buckets.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
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
    LEFT JOIN payment_events pe ON pe.id = le.payment_event_id;

    CREATE OR REPLACE VIEW v_obligation_aging_summary AS
    SELECT
      business_id,
      aging_bucket,
      COUNT(*)::INT AS obligation_count,
      SUM(outstanding)::BIGINT AS total_outstanding
    FROM v_obligation_aging
    GROUP BY business_id, aging_bucket;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP VIEW IF EXISTS v_obligation_aging_summary;

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
