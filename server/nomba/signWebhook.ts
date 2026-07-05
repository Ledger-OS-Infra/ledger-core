import crypto from "crypto";
import type { NombaWebhookPayload } from "./verifyWebhookSignature";

/** Build nomba-signature headers for a webhook payload (tests, Postman scripts). */
export function signNombaWebhook(
  payload: NombaWebhookPayload,
  secret: string,
  timestamp = Date.now().toString(),
): { signature: string; timestamp: string } {
  const merchant = payload.data?.merchant ?? {};
  const transaction = payload.data?.transaction ?? {};

  const responseCode =
    transaction.responseCode === "null" || !transaction.responseCode
      ? ""
      : transaction.responseCode;

  const hashingPayload = [
    payload.event_type ?? "",
    payload.requestId ?? "",
    merchant.userId ?? "",
    merchant.walletId ?? "",
    transaction.transactionId ?? "",
    transaction.type ?? "",
    transaction.time ?? "",
    responseCode,
    timestamp,
  ].join(":");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(hashingPayload)
    .digest("base64");

  return { signature, timestamp };
}
