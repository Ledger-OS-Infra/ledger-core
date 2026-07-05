import { generateDueObligations } from "../lib/billing/generateObligations";
import { pool } from "../db/pool";

async function main(): Promise<void> {
  const asOfDate = process.argv[2];
  const summary = await generateDueObligations(asOfDate);

  console.info(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
