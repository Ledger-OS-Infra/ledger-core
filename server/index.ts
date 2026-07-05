import "./instrument";
import { createApp } from "./app";
import { env } from "./config/env";
import { startBillingObligationWorker } from "./workers/billingObligationWorker";
import { startReconciliationWorker } from "./workers/reconciliationWorker";

const app = createApp();

app.listen(env.port, () => {
  console.info(`Ledger-Core API listening on http://localhost:${env.port}`);
});

void startReconciliationWorker().catch((err) => {
  console.error("Failed to start reconciliation worker", err);
});

void startBillingObligationWorker().catch((err) => {
  console.error("Failed to start billing obligation worker", err);
});
