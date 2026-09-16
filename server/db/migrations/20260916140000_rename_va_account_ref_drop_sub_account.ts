import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("virtual_accounts", (table) => {
    table.renameColumn("nomba_account_ref", "account_ref");
  });

  await knex.schema.alterTable("businesses", (table) => {
    table.dropColumn("nomba_sub_account_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("virtual_accounts", (table) => {
    table.renameColumn("account_ref", "nomba_account_ref");
  });

  await knex.schema.alterTable("businesses", (table) => {
    table.text("nomba_sub_account_id");
  });
}
