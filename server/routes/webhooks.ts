import { Router, type Request, type Response } from "express";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { claimEvent, releaseEvent } from "../idempotency/claimEvent";
import { insertPaymentEvent } from "../db/paymentEvents";
import {
  verifyNombaWebhookSignature,
  type NombaWebhookPayload,
} from "../nomba/verifyWebhookSignature";

export const webhooksRouter = Router();

// TEMPORARY STUB: replace with the real findCustomerByAccountNumber from
// db/customers.ts once #39 (issue #7) merges into main. Always returns "no
// match" for now, so every webhook is intentionally treated as unmatched
// until then. Swapping this for the real import is a one-line change.
async function findCustomerStub(_accountNumber: string): Promise<{
  customerId: string;
  businessId: string;
  virtualAccountId: string;
} | null> {
  return null;
}

webhooksRouter.post(
  env.nombaWebhookPath,
  async (req: Request, res: Response) => {
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

    const transactionId = payload.data?.transaction?.transactionId;

    if (!transactionId) {
      logger.warn(
        { payload },
        "Webhook payload missing transactionId, cannot dedupe",
      );
      res.status(400).json({ error: "Missing transactionId" });
      return;
    }

    const transactionAmount = payload.data?.transaction?.transactionAmount;

    if (transactionAmount === undefined || transactionAmount === null) {
      logger.warn(
        { payload, transactionId },
        "Webhook payload missing transactionAmount, cannot persist",
      );
      res.status(400).json({ error: "Missing transactionAmount" });
      return;
    }

    if (transactionAmount <= 0) {
      logger.warn(
        { transactionAmount, transactionId },
        "Webhook payload has non-positive transactionAmount",
      );
      res.status(400).json({ error: "Transaction amount must be positive" });
      return;
    }

    const isNew = await claimEvent(transactionId);

    if (!isNew) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    // Resolve customer via virtual account lookup. Stubbed until #39 merges,
    // see findCustomerStub above.
    const accountNumber = payload.data?.transaction?.aliasAccountNumber;
    const match = accountNumber ? await findCustomerStub(accountNumber) : null;

    if (!match) {
      logger.warn(
        { transactionId, accountNumber },
        "Unmatched virtual account on webhook, persisting without customer link",
      );
    }

    // Persist the raw event now that #3's schema is merged and
    // payment_events accepts unmatched rows (virtual_account_id /
    // business_id nullable, is_matched flag added).
    //
    // KNOWN GAP: claimEvent already locked this transactionId in Redis
    // above. If this insert fails, the event stays "claimed" for 3 days
    // even though nothing was actually persisted, so a Nomba retry would
    // be silently treated as a duplicate and skipped. Logging loudly here
    // so it's at least visible if it ever happens; revisit if this becomes
    // a real problem.
    try {
      await insertPaymentEvent({
        transactionId,
        transactionAmount,
        virtualAccountId: match?.virtualAccountId ?? null,
        businessId: match?.businessId ?? null,
        isMatched: match !== null,
        senderName: payload.data?.customer?.senderName,
        senderAccount: payload.data?.customer?.accountNumber,
        rawPayload: payload as unknown as Record<string, unknown>,
        receivedAt: new Date(),
      });
    } catch (err) {
      await releaseEvent(transactionId);
      logger.error(
        { err, transactionId },
        "Failed to persist payment event, released Redis claim so retry won't be skipped as duplicate",
      );
      res.status(500).json({ error: "Failed to persist payment event" });
      return;
    }

    // TODO: enqueue reconciliation job (BullMQ) once #15 exists.
    logger.info(
      {
        event_type: payload.event_type,
        requestId: payload.requestId,
        transactionId,
        isMatched: match !== null,
      },
      "Nomba webhook received, claimed, and persisted",
    );

    res.status(200).json({ received: true });
  },
);
