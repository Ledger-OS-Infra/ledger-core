import { claimEvent } from "../idempotency/claimEvent";

const sendToRedis = process.argv.includes("--send");
const eventKey = "manual_test_evt_1";

async function main() {
  console.log("=== Idempotency claim (dry-run) ===");
  console.log(
    JSON.stringify(
      {
        eventKey,
        firstClaim: { key: `event:${eventKey}`, expected: "isNew = true" },
        secondClaim: { key: `event:${eventKey}`, expected: "isNew = false (duplicate)" },
      },
      null,
      2,
    ),
  );

  if (!sendToRedis) {
    console.log(
      "\n(Dry-run — Redis untouched. Pass --send to run real claimEvent calls.)",
    );
    process.exit(0);
  }

  const first = await claimEvent(eventKey);
  const second = await claimEvent(eventKey);
  console.log("First claim:", first);
  console.log("Second claim:", second);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
