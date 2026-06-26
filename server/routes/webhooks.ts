import { Router, type Request, type Response } from "express";
import { env } from "../config/env";
import {
  verifyNombaWebhookSignature,
  type NombaWebhookPayload,
} from "../nomba/verifyWebhookSignature";

export const webhooksRouter = Router();

webhooksRouter.post(env.nombaWebhookPath, (req: Request, res: Response) => {
  const signature = req.header("nomba-signature");
  const timestamp = req.header("nomba-timestamp");

  if (!signature || !timestamp) {
    res.status(401).json({ error: "Missing Nomba signature headers" });
    return;
  }

  const payload = req.body as NombaWebhookPayload;

  try {
    const valid = verifyNombaWebhookSignature(
      payload,
      signature,
      timestamp,
      env.nombaWebhookSecret,
    );

    if (!valid) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  // TODO: enqueue reconciliation job (idempotency + customer lookup)
  console.info("[nomba webhook]", {
    event_type: payload.event_type,
    requestId: payload.requestId,
    transactionId: payload.data?.transaction?.transactionId,
    amount: payload.data?.transaction,
  });

  res.status(200).json({ received: true });
});
