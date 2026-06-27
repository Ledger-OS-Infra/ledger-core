import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await knex.raw(`
    CREATE TYPE customer_status AS ENUM ('ACTIVE', 'INACTIVE');
    CREATE TYPE obligation_type AS ENUM ('INVOICE', 'SUBSCRIPTION', 'FEE', 'LEVY', 'CUSTOM');
    CREATE TYPE obligation_status AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');
    CREATE TYPE ledger_entry_type AS ENUM ('DEBIT', 'CREDIT');
  `);

  await knex.schema.createTable("businesses", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("name").notNullable();
    table.jsonb("metadata").notNullable().defaultTo("{}");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("customers", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("business_id")
      .notNullable()
      .references("id")
      .inTable("businesses")
      .onDelete("RESTRICT");
    table.text("full_name").notNullable();
    table.text("email");
    table.text("phone");
    table
      .specificType("status", "customer_status")
      .notNullable()
      .defaultTo("ACTIVE");
    table.jsonb("metadata").notNullable().defaultTo("{}");
    table.timestamps(true, true);

    table.index("business_id");
  });

  await knex.schema.createTable("virtual_accounts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("customer_id")
      .notNullable()
      .unique()
      .references("id")
      .inTable("customers")
      .onDelete("RESTRICT");
    table.text("nomba_account_ref").notNullable().unique();
    table.text("account_number").notNullable();
    table.text("bank_name").notNullable();
    table.text("bank_code");
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("account_number");
  });

  await knex.schema.createTable("billing_rules", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("business_id")
      .notNullable()
      .references("id")
      .inTable("businesses")
      .onDelete("RESTRICT");
    table
      .uuid("customer_id")
      .notNullable()
      .references("id")
      .inTable("customers")
      .onDelete("RESTRICT");
    table
      .specificType("obligation_type", "obligation_type")
      .notNullable()
      .defaultTo("SUBSCRIPTION");
    table.bigInteger("amount").notNullable();
    table.text("recurrence").notNullable();
    table.smallint("day_of_month");
    table.date("next_run_date").notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.jsonb("metadata").notNullable().defaultTo("{}");
    table.timestamps(true, true);

    table.index("customer_id");
    table.index("next_run_date");
  });

  await knex.schema.createTable("payment_obligations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("business_id")
      .notNullable()
      .references("id")
      .inTable("businesses")
      .onDelete("RESTRICT");
    table
      .uuid("customer_id")
      .notNullable()
      .references("id")
      .inTable("customers")
      .onDelete("RESTRICT");
    table
      .uuid("billing_rule_id")
      .references("id")
      .inTable("billing_rules")
      .onDelete("SET NULL");
    table.specificType("obligation_type", "obligation_type").notNullable();
    table.text("reference_code");
    table.bigInteger("amount").notNullable();
    table.bigInteger("amount_paid").notNullable().defaultTo(0);
    table.date("due_date").notNullable();
    table
      .specificType("status", "obligation_status")
      .notNullable()
      .defaultTo("UNPAID");
    table.jsonb("metadata").notNullable().defaultTo("{}");
    table.timestamps(true, true);

    table.index("customer_id");
    table.index("status");
    table.index("due_date");
    table.index(["customer_id", "status"]);
  });

  await knex.schema.createTable("payment_events", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("business_id")
      .notNullable()
      .references("id")
      .inTable("businesses")
      .onDelete("RESTRICT");
    table
      .uuid("virtual_account_id")
      .notNullable()
      .references("id")
      .inTable("virtual_accounts")
      .onDelete("RESTRICT");
    table.text("idempotency_key").notNullable().unique();
    table.bigInteger("amount").notNullable();
    table.text("sender_name");
    table.text("sender_account");
    table.jsonb("raw_payload").notNullable().defaultTo("{}");
    table.timestamp("received_at", { useTz: true }).notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("virtual_account_id");
    table.index("received_at");
  });

  await knex.schema.createTable("ledger_entries", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("customer_id")
      .notNullable()
      .references("id")
      .inTable("customers")
      .onDelete("RESTRICT");
    table
      .uuid("obligation_id")
      .references("id")
      .inTable("payment_obligations")
      .onDelete("RESTRICT");
    table
      .uuid("payment_event_id")
      .references("id")
      .inTable("payment_events")
      .onDelete("RESTRICT");
    table.specificType("entry_type", "ledger_entry_type").notNullable();
    table.bigInteger("amount").notNullable();
    table.bigInteger("balance_after").notNullable();
    table.text("description").notNullable();
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("customer_id");
    table.index("obligation_id");
    table.index("payment_event_id");
    table.index(["customer_id", "created_at"]);
  });

  await knex.schema.createTable("customer_wallets", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("customer_id")
      .notNullable()
      .unique()
      .references("id")
      .inTable("customers")
      .onDelete("RESTRICT");
    table.bigInteger("balance").notNullable().defaultTo(0);
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE payment_obligations
      ADD CONSTRAINT payment_obligations_amount_positive CHECK (amount > 0),
      ADD CONSTRAINT payment_obligations_amount_paid_non_negative CHECK (amount_paid >= 0);

    ALTER TABLE payment_events
      ADD CONSTRAINT payment_events_amount_positive CHECK (amount > 0);

    ALTER TABLE ledger_entries
      ADD CONSTRAINT ledger_entries_amount_positive CHECK (amount > 0);

    ALTER TABLE customer_wallets
      ADD CONSTRAINT customer_wallets_balance_non_negative CHECK (balance >= 0);

    ALTER TABLE billing_rules
      ADD CONSTRAINT billing_rules_amount_positive CHECK (amount > 0);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("customer_wallets");
  await knex.schema.dropTableIfExists("ledger_entries");
  await knex.schema.dropTableIfExists("payment_events");
  await knex.schema.dropTableIfExists("payment_obligations");
  await knex.schema.dropTableIfExists("billing_rules");
  await knex.schema.dropTableIfExists("virtual_accounts");
  await knex.schema.dropTableIfExists("customers");
  await knex.schema.dropTableIfExists("businesses");

  await knex.raw(`
    DROP TYPE IF EXISTS ledger_entry_type;
    DROP TYPE IF EXISTS obligation_status;
    DROP TYPE IF EXISTS obligation_type;
    DROP TYPE IF EXISTS customer_status;
  `);
}
