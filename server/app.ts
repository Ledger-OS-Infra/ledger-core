import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import * as Sentry from "@sentry/node";
import { env } from "./config/env";
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

  const corsOrigins = new Set([env.frontendUrl]);
  if (env.nodeEnv !== "production") {
    corsOrigins.add("http://localhost:3000");
  }

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (curl, server-to-server) with no Origin header.
        if (!origin || corsOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
    }),
  );
  app.use(requestLogger);
  app.use(express.json());

  const healthHandler = (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  };

  app.get("/health", healthHandler);
  app.get("/", healthHandler);

  app.use("/auth", authRouter);
  app.use(webhooksRouter);

  app.use("/businesses", requireAuth, businessesRouter);
  app.use("/customers", requireAuth, customersRouter);
  app.use("/reporting", requireAuth, reportingRouter);
  app.use(billingRouter);
  app.use(obligationsRouter);

  Sentry.setupExpressErrorHandler(app, {
    shouldHandleError: (err) => !(err instanceof AppError),
  });
  app.use(errorHandler);

  return app;
}
