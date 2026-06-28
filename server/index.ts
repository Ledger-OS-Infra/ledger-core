import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { webhooksRouter } from "./routes/webhooks";
import { reportingRouter } from "./routes/reporting";
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
app.use("/reporting", reportingRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.info(`Ledger-Core API listening on http://localhost:${env.port}`);
});