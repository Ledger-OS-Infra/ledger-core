import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'PAYMENT_APPLIED';
    ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'PARTIAL_PAYMENT';
    ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'OVERPAYMENT_CREDIT';
    ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'WALLET_APPLIED';
  `);
}

export async function down(knex: Knex): Promise<void> {
  // PostgreSQL does not support removing enum values directly.
  // To roll back, the enum would need to be recreated from scratch.
  // Left intentionally as a no-op since removing enum values is destructive.
}