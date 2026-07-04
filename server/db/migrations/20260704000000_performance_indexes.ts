import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_payment_events_business_received
    ON payment_events (business_id, received_at DESC)
    WHERE business_id IS NOT NULL
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_payment_obligations_business_id
    ON payment_obligations (business_id)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_billing_rules_due
    ON billing_rules (next_run_date)
    WHERE is_active = TRUE
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_billing_rules_due`);
  await knex.raw(`DROP INDEX IF EXISTS idx_payment_obligations_business_id`);
  await knex.raw(`DROP INDEX IF EXISTS idx_payment_events_business_received`);
}
