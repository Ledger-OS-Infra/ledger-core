import type { Knex } from "knex";

/**
 * Idempotent MBU generation: one obligation per billing rule per reference_code (e.g. MBU-2026-06).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE UNIQUE INDEX payment_obligations_billing_rule_reference_unique
    ON payment_obligations (billing_rule_id, reference_code)
    WHERE billing_rule_id IS NOT NULL AND reference_code IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS payment_obligations_billing_rule_reference_unique
  `);
}
