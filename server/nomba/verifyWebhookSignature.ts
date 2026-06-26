import crypto from "crypto";

/** Nomba webhook body (fields used for signature verification). */
export interface NombaWebhookPayload {
  event_type?: string;
  requestId?: string;
  data?: {
    merchant?: {
      userId?: string;
      walletId?: string;
    };
    transaction?: {
      transactionId?: string;
      type?: string;
      time?: string;
      responseCode?: string;
    };
  };
}

/**
 * Verifies the `nomba-signature` header per Nomba docs:
 * https://developer.nomba.com/docs/api-basics/webhook
 */
export function verifyNombaWebhookSignature(
  payload: NombaWebhookPayload,
  signature: string,
  timestamp: string,
  secret: string,
): boolean {
  const merchant = payload.data?.merchant ?? {};
  const transaction = payload.data?.transaction ?? {};

  let responseCode = transaction.responseCode ?? "";
  if (responseCode === "null") {
    responseCode = "";
  }

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

  const expected = crypto
    .createHmac("sha256", secret)
    .update(hashingPayload)
    .digest("base64");

  if (expected.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature),
  );
}
