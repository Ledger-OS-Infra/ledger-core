import { Queue } from "bullmq";
import { getBullMqConnection } from "../redis/bullmqConnection";

export const BILLING_OBLIGATION_QUEUE = "billing-obligation-generation";
export const GENERATE_DUE_JOB = "generate-due";
export const DAILY_SCHEDULER_ID = "billing-daily-generate-due";

let queue: Queue | null = null;

export function getBillingObligationQueue(): Queue {
  if (!queue) {
    queue = new Queue(BILLING_OBLIGATION_QUEUE, {
      connection: getBullMqConnection(),
    });
  }
  return queue;
}

/** Daily at 00:00 UTC — generates obligations for all rules with next_run_date <= today. */
export async function registerBillingCron(): Promise<void> {
  const billingQueue = getBillingObligationQueue();
  await billingQueue.upsertJobScheduler(
    DAILY_SCHEDULER_ID,
    { pattern: "0 0 * * *" },
    { name: GENERATE_DUE_JOB, data: {} },
  );
}

export async function closeBillingQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
