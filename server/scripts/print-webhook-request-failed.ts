import crypto from "crypto";
import { env } from "../config/env";

const payload = {
  event_type: "payment_failed",
  requestId: "req_insomnia_002",
  data: {
    merchant: { userId: "usr_test_71kd89" },
    terminal: { terminalLabel: "IKEJA MALL", terminalId: "3PLQTEST" },
    transaction: {
      type: "purchase",
      transactionId: "txn_insomnia_failed_" + Date.now(),
      responseCodeMessage: "Insufficient Funds",
      rrn: "251008TEST5",
      cardIssuer: "MASTERCARD",
      responseCode: "51",
      originatingFrom: "pos",
      terminalSerialNumber: "9123098TEST",
      cardBank: "058",
      transactionAmount: 25000,
      time: new Date().toISOString(),
    },
    customer: {
      productId: "058",
      cardPan: "539983 **** **** 4297",
    },
  },
};

const timestamp = Date.now().toString();
const merchant = payload.data.merchant as { userId?: string; walletId?: string };
const transaction = payload.data.transaction;

const hashingPayload = [
  payload.event_type,
  payload.requestId,
  merchant.userId ?? "",
  merchant.walletId ?? "",
  transaction.transactionId,
  transaction.type,
  transaction.time,
  transaction.responseCode,
  timestamp,
].join(":");

const signature = crypto
  .createHmac("sha256", env.nombaWebhookSecret)
  .update(hashingPayload)
  .digest("base64");

console.log("=== nomba-signature ===");
console.log(signature);
console.log("\n=== nomba-timestamp ===");
console.log(timestamp);
console.log("\n=== Body (paste into Insomnia JSON body) ===");
console.log(JSON.stringify(payload, null, 2));