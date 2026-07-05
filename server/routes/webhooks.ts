import * as Sentry from "@sentry/node";
import { Router, type Request, type Response } from "express";
import { env } from "../config/env";
import { findCustomerByAccountNumber } from "../db/customers";
import { insertPaymentEvent } from "../db/paymentEvents";
import { claimEvent, releaseEvent } from "../idempotency/claimEvent";
import { logger } from "../lib/logger";
import {
  verifyNombaWebhookSignature,
  type NombaWebhookPayload,
} from "../nomba/verifyWebhookSignature";
import { enqueueReconciliationJob } from "../queues/reconciliation";

export const webhooksRouter = Router();

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

    Sentry.addBreadcrumb({
      category: "webhook",
      message: "Payload received",
      data: { event_type: payload.event_type },
    });

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

    Sentry.addBreadcrumb({ category: "webhook", message: "Signature verified" });

    const transactionId = payload.data?.transaction?.transactionId;

    if (!transactionId) {
      logger.warn(
        { event_type: payload.event_type, requestId: payload.requestId },
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

    Sentry.addBreadcrumb({
      category: "webhook",
      message: "Event claimed",
      data: { transaction_id: transactionId, is_new: isNew },
    });

    if (!isNew) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    const accountNumber = payload.data?.transaction?.aliasAccountNumber;
    const customer = accountNumber
      ? await findCustomerByAccountNumber(accountNumber)
      : null;

    Sentry.addBreadcrumb({
      category: "reconciliation",
      message: "Customer lookup complete",
      data: { matched: customer !== null, virtual_account_id: customer?.virtual_account.id ?? null },
    });

    if (!customer) {
      logger.warn(
        { transactionId, accountNumber },
        "Unknown virtual account on webhook — persisting as unmatched",
      );
    }

    let paymentEvent;

    try {
      paymentEvent = await insertPaymentEvent({
        transactionId,
        transactionAmount,
        virtualAccountId: customer?.virtual_account.id ?? null,
        businessId: customer?.business_id ?? null,
        isMatched: customer !== null,
        senderName: payload.data?.customer?.senderName,
        senderAccount: payload.data?.customer?.accountNumber,
        rawPayload: payload as unknown as Record<string, unknown>,
        receivedAt: new Date(),
      });
    } catch (err) {
      Sentry.withScope((scope) => {
        scope.setTag("transaction_id", transactionId);
        scope.setContext("payment_event", {
          business_id: customer?.business_id ?? null,
          virtual_account_id: customer?.virtual_account.id ?? null,
          is_matched: customer !== null,
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

    if (customer) {
      void enqueueReconciliationJob({ paymentEventId: paymentEvent.id }).catch(
        (err) => {
          logger.error(
            { err, paymentEventId: paymentEvent.id, transactionId },
            "Failed to enqueue reconciliation job",
          );
        },
      );
    }

    logger.info(
      {
        event_type: payload.event_type,
        requestId: payload.requestId,
        transactionId,
        paymentEventId: paymentEvent.id,
        isMatched: customer !== null,
        customerId: customer?.id,
      },
      "Nomba webhook received, claimed, and persisted",
    );

    res.status(200).json({ received: true });
  },
);