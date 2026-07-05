import "../instrument";
import * as Sentry from "@sentry/node";

async function main() {
  console.log("Sending test event to Sentry...");

  Sentry.captureException(new Error("Sentry test — Ledger-Core server is wired up"), {
    tags: { test: "true", source: "test-sentry-script" },
    extra: { note: "Delete this script after confirming the event appears in the dashboard" },
  });

  // flush ensures the event is delivered before the process exits
  await Sentry.flush(3000);
  console.log("Done. Check your Sentry dashboard for the test event.");
}

main().catch(console.error);
