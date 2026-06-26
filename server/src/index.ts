import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { webhooksRouter } from "./routes/webhooks";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(webhooksRouter);

app.listen(env.port, () => {
  console.info(`Ledger-Core API listening on http://localhost:${env.port}`);
  console.info(`Webhook path: POST http://localhost:${env.port}${env.nombaWebhookPath}`);
  if (!env.publicWebhookUrl) {
    console.info(
      "Set PUBLIC_WEBHOOK_URL after exposing this server (e.g. ngrok) for Nomba activation.",
    );
    return;
  }

  console.info(`Submit this URL to Nomba: ${env.publicWebhookUrl}`);
});
