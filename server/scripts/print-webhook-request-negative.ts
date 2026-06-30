import crypto from "crypto";
import { env } from "../config/env";

const payload = {
  event_type: "payment_success",
  requestId: "req_insomnia_003",
  data: {
    merchant: { userId: "merchant_test_user", walletId: "merchant_test_wallet" },
    transaction: {
      transactionId: "txn_insomnia_negative_" + Date.now(),
      type: "vact_transfer",
      time: new Date().toISOString(),
      responseCode: "",
      aliasAccountNumber: "9671300012",
      aliasAccountName: "Ledger-Core Test/John Doe",
      aliasAccountReference: "test_va_ref_001",
      transactionAmount: -100,
    },
    customer: {
      senderName: "Jane Sender",
      bankName: "Test Bank",
      accountNumber: "0123456789",
    },
  },
};

const timestamp = Date.now().toString();
const merchant = payload.data.merchant;
const transaction = payload.data.transaction;

const hashingPayload = [
  payload.event_type,
  payload.requestId,
  merchant.userId,
  merchant.walletId,
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