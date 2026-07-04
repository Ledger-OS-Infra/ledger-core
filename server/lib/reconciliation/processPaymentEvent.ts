import { getPaymentEventById } from "../../db/paymentEvents";
import { listUnsettledObligationsByCustomer } from "../../db/obligations";
import { pool } from "../../db/pool";
import { logger } from "../logger";
import { allocatePayment } from "./allocatePayment";
import { matchPayment } from "./matchPayment";

export interface ProcessPaymentEventResult {
  paymentEventId: string;
  status: "skipped_unmatched" | "no_open_obligations" | "no_match" | "allocated";
  strategy?: string;
  obligationId?: string;
}

async function getCustomerIdByVirtualAccountId(
  virtualAccountId: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ customer_id: string }>(
    `SELECT customer_id FROM virtual_accounts WHERE id = $1`,
    [virtualAccountId],
  );

  return rows[0]?.customer_id ?? null;
}

function extractReferenceCode(
  rawPayload: Record<string, unknown>,
): string | null {
  const data = rawPayload.data as Record<string, unknown> | undefined;
  const transaction = data?.transaction as Record<string, unknown> | undefined;
  const reference = transaction?.aliasAccountReference;

  return typeof reference === "string" && reference.length > 0
    ? reference
    : null;
}

export async function processPaymentEvent(
  paymentEventId: string,
): Promise<ProcessPaymentEventResult> {
  const event = await getPaymentEventById(paymentEventId);

  if (!event) {
    throw new Error(`Payment event not found: ${paymentEventId}`);
  }

  if (!event.is_matched || !event.virtual_account_id) {
    logger.warn(
      { paymentEventId, isMatched: event.is_matched },
      "Skipping reconciliation for unmatched payment event",
    );
    return { paymentEventId, status: "skipped_unmatched" };
  }

  const customerId = await getCustomerIdByVirtualAccountId(
    event.virtual_account_id,
  );

  if (!customerId) {
    logger.warn(
      { paymentEventId, virtualAccountId: event.virtual_account_id },
      "Virtual account on payment event has no customer",
    );
    return { paymentEventId, status: "skipped_unmatched" };
  }

  const obligations = await listUnsettledObligationsByCustomer(customerId);

  if (obligations.length === 0) {
    logger.info(
      { paymentEventId, customerId },
      "No open obligations for customer; payment left unallocated",
    );
    return { paymentEventId, status: "no_open_obligations" };
  }

  const referenceCode = extractReferenceCode(event.raw_payload);
  const match = matchPayment(
    Number(event.amount),
    obligations,
    referenceCode,
  );

  if (!match) {
    logger.info(
      { paymentEventId, customerId, amount: event.amount },
      "Payment did not match any obligation",
    );
    return { paymentEventId, status: "no_match" };
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const allocation = await allocatePayment(match, paymentEventId, client);
    await client.query("COMMIT");

    logger.info(
      {
        paymentEventId,
        customerId,
        obligationId: allocation.obligationId,
        strategy: match.strategy,
        amountApplied: allocation.amountApplied,
      },
      "Payment reconciled and allocated",
    );

    return {
      paymentEventId,
      status: "allocated",
      strategy: match.strategy,
      obligationId: allocation.obligationId,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
