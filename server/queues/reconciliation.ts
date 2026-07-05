import { Queue } from "bullmq";
import { getBullMqConnection } from "../redis/bullmqConnection";

export const RECONCILIATION_QUEUE = "payment-reconciliation";
export const PROCESS_PAYMENT_EVENT_JOB = "process-payment-event";

export interface ReconciliationJobData {
  paymentEventId: string;
}

let queue: Queue<ReconciliationJobData> | null = null;

export function getReconciliationQueue(): Queue<ReconciliationJobData> {
  if (!queue) {
    queue = new Queue<ReconciliationJobData>(RECONCILIATION_QUEUE, {
      connection: getBullMqConnection(),
    });
  }
  return queue;
}

export async function enqueueReconciliationJob(
  data: ReconciliationJobData,
): Promise<void> {
  const reconciliationQueue = getReconciliationQueue();
  await reconciliationQueue.add(PROCESS_PAYMENT_EVENT_JOB, data, {
    jobId: data.paymentEventId,
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

export async function closeReconciliationQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
