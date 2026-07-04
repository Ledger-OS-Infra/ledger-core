import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TYPE user_status AS ENUM ('active', 'suspended');
    CREATE TYPE auth_token_type AS ENUM ('email_verify', 'password_reset');
    CREATE TYPE business_member_role AS ENUM ('owner', 'admin', 'viewer');
  `);

  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.text("email").notNullable().unique();
    table.text("password_hash").notNullable();
    table.text("full_name").notNullable();
    table
      .specificType("status", "user_status")
      .notNullable()
      .defaultTo("active");
    table.timestamp("email_verified_at", { useTz: true });
    table.timestamps(true, true);

    table.index("email");
  });

  await knex.schema.createTable("auth_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.specificType("type", "auth_token_type").notNullable();
    table.text("token_hash").notNullable();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("used_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
    table.index("token_hash");
  });

  await knex.schema.createTable("refresh_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.text("token_hash").notNullable().unique();
    table.timestamp("expires_at", { useTz: true }).notNullable();
    table.timestamp("revoked_at", { useTz: true });
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index("user_id");
  });

  await knex.schema.createTable("business_members", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("business_id")
      .notNullable()
      .references("id")
      .inTable("businesses")
      .onDelete("CASCADE");
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .specificType("role", "business_member_role")
      .notNullable()
      .defaultTo("viewer");
    table.timestamp("joined_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamps(true, true);

    table.unique(["business_id", "user_id"]);
    table.index("user_id");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("business_members");
  await knex.schema.dropTableIfExists("refresh_tokens");
  await knex.schema.dropTableIfExists("auth_tokens");
  await knex.schema.dropTableIfExists("users");

  await knex.raw(`
    DROP TYPE IF EXISTS business_member_role;
    DROP TYPE IF EXISTS auth_token_type;
    DROP TYPE IF EXISTS user_status;
  `);
}
