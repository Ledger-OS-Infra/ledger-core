import * as Sentry from "@sentry/node";
import { Router, type Request, type Response } from "express";
import { env } from "../config/env";
import {
  findCustomerByAccountNumber,
  findCustomerByAccountRef,
} from "../db/customers";
import { insertPaymentEvent } from "../db/paymentEvents";
import { claimEvent, releaseEvent } from "../idempotency/claimEvent";
import { isPgUniqueViolation } from "../lib/pgErrors";
import { logger } from "../lib/logger";
import { processPaymentEvent } from "../lib/reconciliation/processPaymentEvent";
import { getPaymentProvider } from "../payments";
import { enqueueReconciliationJob } from "../queues/reconciliation";

export const webhooksRouter = Router();

const CANONICAL_WEBHOOK_PATH = "/webhooks/flutterwave";

async function handleFlutterwaveWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  const provider = getPaymentProvider();

  if (!provider.verifyWebhookSignature(req)) {
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const payload = req.body as Record<string, unknown>;

  Sentry.addBreadcrumb({
    category: "webhook",
    message: "Payload received",
    data: { event: payload.event },
  });

  if (!provider.isCreditableWebhook(payload)) {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  let transactionId: string;
  try {
    transactionId = provider.getIdempotencyKey(payload);
  } catch {
    logger.warn({ payload }, "Webhook payload missing idempotency key");
    res.status(400).json({ error: "Missing flw_ref" });
    return;
  }

  let parsed;
  try {
    parsed = provider.parseWebhookPayload(payload);
  } catch {
    logger.warn({ payload, transactionId }, "Webhook payload has invalid amount");
    res.status(400).json({ error: "Invalid transaction amount" });
    return;
  }

  if (parsed.amount <= 0) {
    logger.warn(
      { amount: parsed.amount, transactionId },
      "Webhook payload has non-positive amount",
    );
    res.status(400).json({ error: "Transaction amount must be positive" });
    return;
  }

  const isNew = await claimEvent(transactionId);

  Sentry.addBreadcrumb({
    category: "webhook",
    message: "Event claimed",
    data: { transaction_id: transactionId, is_new: isNew },
  });

  if (!isNew) {
    res.status(200).json({ received: true, duplicate: true });
    return;
  }

  let customer = parsed.reference
    ? await findCustomerByAccountRef(parsed.reference)
    : null;

  if (!customer && parsed.accountNumber) {
    customer = await findCustomerByAccountNumber(parsed.accountNumber);
  }

  const virtualAccount = customer?.virtual_account ?? null;

  Sentry.addBreadcrumb({
    category: "reconciliation",
    message: "Customer lookup complete",
    data: {
      matched: virtualAccount !== null,
      virtual_account_id: virtualAccount?.id ?? null,
    },
  });

  if (!customer) {
    logger.warn(
      {
        transactionId,
        accountNumber: parsed.accountNumber,
        accountRef: parsed.reference,
      },
      "Unknown virtual account on webhook — persisting as unmatched",
    );
  }

  let paymentEvent;

  try {
    paymentEvent = await insertPaymentEvent({
      transactionId,
      transactionAmount: parsed.amount,
      virtualAccountId: virtualAccount?.id ?? null,
      businessId: customer?.business_id ?? null,
      isMatched: virtualAccount !== null,
      senderName: parsed.senderName,
      senderAccount: parsed.senderAccount,
      rawPayload: payload,
      receivedAt: new Date(),
    });
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    Sentry.withScope((scope) => {
      scope.setTag("transaction_id", transactionId);
      scope.setContext("payment_event", {
        business_id: customer?.business_id ?? null,
        virtual_account_id: virtualAccount?.id ?? null,
        is_matched: virtualAccount !== null,
      });
      Sentry.captureException(err);
    });
    await releaseEvent(transactionId);
    logger.error(
      { err, transactionId },
      "Failed to persist payment event, released Redis claim so retry won't be skipped as duplicate",
    );
    res.status(500).json({ error: "Failed to persist payment event" });
    return;
  }

  if (virtualAccount) {
    if (process.env.VERCEL) {
      try {
        await processPaymentEvent(paymentEvent.id);
      } catch (err) {
        logger.error(
          { err, paymentEventId: paymentEvent.id, transactionId },
          "Inline reconciliation failed on serverless",
        );
      }
    } else {
      void enqueueReconciliationJob({ paymentEventId: paymentEvent.id }).catch(
        (err) => {
          logger.error(
            { err, paymentEventId: paymentEvent.id, transactionId },
            "Failed to enqueue reconciliation job",
          );
        },
      );
    }
  }

  logger.info(
    {
      event: payload.event,
      transactionId,
      paymentEventId: paymentEvent.id,
      isMatched: virtualAccount !== null,
      customerId: customer?.id,
    },
    "Flutterwave webhook received, claimed, and persisted",
  );

  res.status(200).json({ received: true });
}

webhooksRouter.post(env.flutterwaveConfig.webhookPath, handleFlutterwaveWebhook);

if (env.flutterwaveConfig.webhookPath !== CANONICAL_WEBHOOK_PATH) {
  webhooksRouter.post(CANONICAL_WEBHOOK_PATH, handleFlutterwaveWebhook);
}

webhooksRouter.get(CANONICAL_WEBHOOK_PATH, (_req, res) => {
  res.status(405).json({
    error:
      "Flutterwave webhooks must use POST with the verif-hash header",
  });
});
