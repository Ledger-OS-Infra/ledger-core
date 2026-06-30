import type { Knex } from "knex";

const V_BUSINESS_METRICS_SQL = `
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
`;

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`DROP VIEW IF EXISTS v_business_metrics;`);

  await knex.schema.alterTable("payment_events", (table) => {
    table.uuid("virtual_account_id").nullable().alter();
    table.uuid("business_id").nullable().alter();
    table.boolean("is_matched").notNullable().defaultTo(true);
  });

  await knex.raw(V_BUSINESS_METRICS_SQL);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP VIEW IF EXISTS v_business_metrics;`);

  await knex.schema.alterTable("payment_events", (table) => {
    table.dropColumn("is_matched");
    table.uuid("business_id").notNullable().alter();
    table.uuid("virtual_account_id").notNullable().alter();
  });

  await knex.raw(V_BUSINESS_METRICS_SQL);
}