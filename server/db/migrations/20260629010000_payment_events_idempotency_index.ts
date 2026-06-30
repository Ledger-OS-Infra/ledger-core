import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `CREATE INDEX IF NOT EXISTS idx_payment_events_idempotency_key ON payment_events(idempotency_key);`,
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS idx_payment_events_idempotency_key;`);
}