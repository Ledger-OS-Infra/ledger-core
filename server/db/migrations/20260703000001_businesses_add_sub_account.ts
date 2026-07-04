import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("businesses", (table) => {
    table.text("nomba_sub_account_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("businesses", (table) => {
    table.dropColumn("nomba_sub_account_id");
  });
}
