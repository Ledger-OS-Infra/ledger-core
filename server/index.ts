import "./instrument";
import cors from "cors";
import express from "express";
import * as Sentry from "@sentry/node";
import { env } from "./config/env";
import { AppError } from "./lib/AppError";
import { webhooksRouter } from "./routes/webhooks";
import { reportingRouter } from "./routes/reporting";
import { obligationsRouter } from "./routes/obligations";
import { billingRouter } from "./routes/billing";
import { customersRouter } from "./routes/customers";
import { startBillingObligationWorker } from "./workers/billingObligationWorker";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(requestLogger);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({ message: "Hello World" });
});

app.use(webhooksRouter);
app.use("/customers", customersRouter);
app.use("/reporting", reportingRouter);
app.use(billingRouter);
app.use(obligationsRouter);

Sentry.setupExpressErrorHandler(app, {
  shouldHandleError: (err) => !(err instanceof AppError),
});
app.use(errorHandler);

app.listen(env.port, () => {
  console.info(`Ledger-Core API listening on http://localhost:${env.port}`);
});

void startBillingObligationWorker().catch((err) => {
  console.error("Failed to start billing obligation worker", err);
});
