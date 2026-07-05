import crypto from "crypto";
import { env } from "../config/env";

const samplePayload = {
  event_type: "payment_success",
  requestId: "req_test_001",
  data: {
    merchant: {
      userId: "merchant_test_user",
      walletId: "merchant_test_wallet",
    },
    transaction: {
      transactionId: "txn_test_" + Date.now(),
      type: "virtual_account_credit",
      time: "2026-06-27T20:00:00.000Z",
      responseCode: "00",
      aliasAccountNumber: "5460127111",
      aliasAccountName: "Celo Africa DAO",
      aliasAccountReference: "SUB-2026-608",
      transactionAmount: 3000000,
    },
    customer: {
      senderName: "Jane Sender",
      bankName: "Test Bank",
      accountNumber: "0123456789",
    },
  },
};

function signPayload(
  payload: typeof samplePayload,
  timestamp: string,
  secret: string,
): string {
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

  return crypto
    .createHmac("sha256", secret)
    .update(hashingPayload)
    .digest("base64");
}

async function sendWebhook() {
  const timestamp = Date.now().toString();
  const signature = signPayload(
    samplePayload,
    timestamp,
    env.nombaWebhookSecret,
  );

  const res = await fetch(
    `http://localhost:${env.port}${env.nombaWebhookPath}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "nomba-signature": signature,
        "nomba-timestamp": timestamp,
      },
      body: JSON.stringify(samplePayload),
    },
  );

  const body = await res.json();
  console.log("Status:", res.status, "Body:", body);
}

async function main() {
  console.log("--- First delivery ---");
  await sendWebhook();
  console.log("--- Second delivery (same transactionId) ---");
  await sendWebhook();
}

main();
