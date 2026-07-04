import { Worker } from "bullmq";
import { processPaymentEvent } from "../lib/reconciliation/processPaymentEvent";
import { logger } from "../lib/logger";
import {
  PROCESS_PAYMENT_EVENT_JOB,
  RECONCILIATION_QUEUE,
} from "../queues/reconciliation";
import { getBullMqConnection } from "../redis/bullmqConnection";

let worker: Worker | null = null;

export async function startReconciliationWorker(): Promise<Worker> {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    RECONCILIATION_QUEUE,
    async (job) => {
      if (job.name === PROCESS_PAYMENT_EVENT_JOB) {
        const { paymentEventId } = job.data as { paymentEventId: string };
        return processPaymentEvent(paymentEventId);
      }
      throw new Error(`Unknown reconciliation job: ${job.name}`);
    },
    { connection: getBullMqConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error(
      {
        err,
        jobId: job?.id,
        jobName: job?.name,
        queue: RECONCILIATION_QUEUE,
        paymentEventId: (job?.data as { paymentEventId?: string } | undefined)
          ?.paymentEventId,
      },
      "Reconciliation job failed",
    );
  });

  worker.on("completed", (job) => {
    logger.info(
      {
        jobId: job.id,
        jobName: job.name,
        result: job.returnvalue,
      },
      "Reconciliation job completed",
    );
  });

  logger.info({ queue: RECONCILIATION_QUEUE }, "Reconciliation worker started");

  return worker;
}

export async function stopReconciliationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
