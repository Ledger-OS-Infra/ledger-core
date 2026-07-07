import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("customers", (table) => {
    table.text("password_hash");
  });

  await knex.raw(`
    CREATE UNIQUE INDEX customers_email_unique_idx
    ON customers (lower(email))
    WHERE email IS NOT NULL
  `);

  await knex.schema.createTable("customer_auth_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("customer_id")
      .notNullable()
      .references("id")
      .inTable("customers")
      .onDelete("CASCADE");
    table.text("token_hash").notNullable();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("used_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("customer_id");
    table.index("token_hash");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("customer_auth_tokens");
  await knex.raw(`DROP INDEX IF EXISTS customers_email_unique_idx`);
  await knex.schema.alterTable("customers", (table) => {
    table.dropColumn("password_hash");
  });
}