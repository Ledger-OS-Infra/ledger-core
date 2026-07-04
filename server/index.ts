import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { webhooksRouter } from "./routes/webhooks";
import { reportingRouter } from "./routes/reporting";
import { obligationsRouter } from "./routes/obligations";
import { billingRouter } from "./routes/billing";
import { customersRouter } from "./routes/customers";
import { businessesRouter } from "./routes/businesses";
import { startBillingObligationWorker } from "./workers/billingObligationWorker";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/requireAuth";

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

// Public routes
app.use("/auth", authRouter);
app.use(webhooksRouter);

// Protected routes
app.use("/businesses", requireAuth, businessesRouter);
app.use("/customers", requireAuth, customersRouter);
app.use("/reporting", requireAuth, reportingRouter);
app.use(requireAuth, billingRouter);
app.use(requireAuth, obligationsRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.info(`Ledger-Core API listening on http://localhost:${env.port}`);
});

void startBillingObligationWorker().catch((err) => {
  console.error("Failed to start billing obligation worker", err);
});
