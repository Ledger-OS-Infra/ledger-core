import { Queue } from "bullmq";
import { getBullMqConnection } from "../redis/bullmqConnection";

export const RECONCILIATION_QUEUE = "reconciliation-payment";
export const PROCESS_PAYMENT_JOB = "process-payment-event";

export interface ReconciliationJobData {
  paymentEventId: string;
  transactionId: string;
  transactionAmount: number;
  aliasAccountNumber: string | null;
  narration: string | null;
  customerId: string | null;
  virtualAccountId: string | null;
  businessId: string | null;
}

let queue: Queue | null = null;

export function getReconciliationQueue(): Queue {
  if (!queue) {
    queue = new Queue(RECONCILIATION_QUEUE, {
      connection: getBullMqConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return queue;
}

export async function enqueueReconciliationJob(
  data: ReconciliationJobData,
): Promise<void> {
  const q = getReconciliationQueue();
  await q.add(PROCESS_PAYMENT_JOB, data, {
    jobId: data.transactionId,
  });
}

export async function closeReconciliationQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}