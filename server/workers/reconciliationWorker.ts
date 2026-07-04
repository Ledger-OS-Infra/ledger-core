import { Worker } from "bullmq";
import { pool } from "../db/pool";
import { findCustomerByAccountNumber } from "../db/customers";
import { listObligationsByCustomer } from "../db/obligations";
import { logger } from "../lib/logger";
import { matchPayment } from "../lib/reconciliation/matchPayment";
import { allocatePayment } from "../lib/reconciliation/allocatePayment";
import { listRawObligationsByCustomer } from "../db/obligations";
import {
  PROCESS_PAYMENT_JOB,
  RECONCILIATION_QUEUE,
  type ReconciliationJobData,
} from "../queues/reconciliationQueue";
import { getBullMqConnection } from "../redis/bullmqConnection";

let worker: Worker | null = null;

export async function startReconciliationWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    RECONCILIATION_QUEUE,
    async (job) => {
      if (job.name !== PROCESS_PAYMENT_JOB) {
        throw new Error(`Unknown reconciliation job: ${job.name}`);
      }

      const data = job.data as ReconciliationJobData;
      const {
        paymentEventId,
        transactionId,
        transactionAmount,
        aliasAccountNumber,
        narration,
      } = data;

      logger.info(
        { paymentEventId, transactionId },
        "Reconciliation job started",
      );

      // Step 1: Resolve customer from virtual account number
      const customer = aliasAccountNumber
        ? await findCustomerByAccountNumber(aliasAccountNumber)
        : null;

      if (!customer) {
        logger.warn(
          { paymentEventId, transactionId, aliasAccountNumber },
          "Unmatched virtual account, no customer found, skipping allocation",
        );
        return { matched: false, reason: "no_customer" };
      }

      // Step 2: Fetch open obligations for this customer
      const obligations = await listObligationsByCustomer(customer.id, {
        status: "UNPAID",
      });

      const partialObligations = await listObligationsByCustomer(customer.id, {
        status: "PARTIAL",
      });

      const openObligations = await listRawObligationsByCustomer(
        customer.id,
        {},
      );
      const filteredObligations = openObligations.filter(
        (o) => o.status === "UNPAID" || o.status === "PARTIAL",
      );
      if (openObligations.length === 0) {
        logger.warn(
          { paymentEventId, transactionId, customerId: customer.id },
          "No open obligations found for customer",
        );
        return { matched: false, reason: "no_open_obligations" };
      }

      // Step 3: Match payment using the matching engine
      const match = matchPayment(
        transactionAmount,
        openObligations,
        narration ?? undefined,
      );

      if (!match) {
        logger.warn(
          { paymentEventId, transactionId, customerId: customer.id },
          "No matching obligation found",
        );
        return { matched: false, reason: "no_match" };
      }

      // Step 4: Allocate payment atomically
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const result = await allocatePayment(match, paymentEventId, client);

        await client.query("COMMIT");

        logger.info(
          {
            paymentEventId,
            transactionId,
            obligationId: result.obligationId,
            newStatus: result.newStatus,
            amountApplied: result.amountApplied,
            excessCreditedToWallet: result.excessCreditedToWallet,
          },
          "Reconciliation job completed successfully",
        );

        return { matched: true, result };
      } catch (err) {
        await client.query("ROLLBACK");
        logger.error(
          { err, paymentEventId, transactionId },
          "Reconciliation job failed, transaction rolled back",
        );
        throw err;
      } finally {
        client.release();
      }
    },
    {
      connection: getBullMqConnection(),
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error(
      {
        err,
        jobId: job?.id,
        jobName: job?.name,
        queue: RECONCILIATION_QUEUE,
        attempts: job?.attemptsMade,
      },
      "Reconciliation job failed",
    );
  });

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, jobName: job.name },
      "Reconciliation job completed",
    );
  });

  logger.info(
    { queue: RECONCILIATION_QUEUE, concurrency: 5 },
    "Reconciliation worker started",
  );

  return worker;
}

export async function stopReconciliationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
