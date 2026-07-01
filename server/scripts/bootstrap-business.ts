/**
 * Inserts the single tenant business row required before POST /customers.
 * Does not load John/Raphael demo data — use Postman flow for manual creation.
 */
import knex from "knex";
import config from "../knexfile";

const BUSINESS_ID = "11111111-1111-1111-1111-111111111101";

async function main(): Promise<void> {
  const db = knex(config);

  try {
    const existing = await db("businesses").where({ id: BUSINESS_ID }).first();

    if (existing) {
      console.info(`Business already exists: ${existing.name} (${BUSINESS_ID})`);
      return;
    }

    await db("businesses").insert({
      id: BUSINESS_ID,
      name: "Ledger-Core Demo Business",
      metadata: JSON.stringify({ source: "bootstrap" }),
    });

    console.info(`Created business: ${BUSINESS_ID}`);
    console.info("Next: npm run dev, then run Postman Flow step 1.");
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
