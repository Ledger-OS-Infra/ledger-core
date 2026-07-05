import cors from "cors";
import express, { type Express } from "express";
import * as Sentry from "@sentry/node";
import { AppError } from "./lib/AppError";
import { authRouter } from "./routes/auth";
import { webhooksRouter } from "./routes/webhooks";
import { reportingRouter } from "./routes/reporting";
import { obligationsRouter } from "./routes/obligations";
import { billingRouter } from "./routes/billing";
import { customersRouter } from "./routes/customers";
import { businessesRouter } from "./routes/businesses";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { requireAuth } from "./middleware/requireAuth";

/** Express app without listen() — used by the server entrypoint and integration tests. */
export function createApp(): Express {
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

  app.use("/auth", authRouter);
  app.use(webhooksRouter);

  app.use("/businesses", requireAuth, businessesRouter);
  app.use("/customers", requireAuth, customersRouter);
  app.use("/reporting", requireAuth, reportingRouter);
  app.use(requireAuth, billingRouter);
  app.use(requireAuth, obligationsRouter);

  Sentry.setupExpressErrorHandler(app, {
    shouldHandleError: (err) => !(err instanceof AppError),
  });
  app.use(errorHandler);

  return app;
}
