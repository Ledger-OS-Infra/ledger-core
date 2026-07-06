import "./instrument";
import { createApp } from "./app";
import { env } from "./config/env";
import { startBillingObligationWorker } from "./workers/billingObligationWorker";
import { startReconciliationWorker } from "./workers/reconciliationWorker";

const app = createApp();

/** Long-running server (local, Docker, Railway, etc.) — not Vercel serverless. */
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.info(`Ledger-Core API listening on http://localhost:${env.port}`);
    console.info(`Nomba environment: ${env.nombaEnvironment}`);
  });

  void startReconciliationWorker().catch((err) => {
    console.error("Failed to start reconciliation worker", err);
  });

  void startBillingObligationWorker().catch((err) => {
    console.error("Failed to start billing obligation worker", err);
  });
}
