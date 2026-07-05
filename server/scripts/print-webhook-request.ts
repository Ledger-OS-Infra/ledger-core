import { env } from "../config/env";
import { signNombaWebhook } from "../nomba/signWebhook";
import type { NombaWebhookPayload } from "../nomba/verifyWebhookSignature";

// Edit these values to simulate a payment for your customer / obligation.
const payload: NombaWebhookPayload = {
  event_type: "payment_success",
  requestId: "req_insomnia_001",
  data: {
    merchant: { userId: "merchant_test_user", walletId: "merchant_test_wallet" },
    transaction: {
      transactionId: "txn_insomnia_" + Date.now(),
      type: "vact_transfer",
      time: new Date().toISOString(),
      responseCode: "",
      aliasAccountNumber: "8560355060",
      aliasAccountName: "Life on the rock hospitals",
      aliasAccountReference: "SUB-2026-176",
      transactionAmount: 15000000,
    },
    customer: {
      senderName: "Jane Sender",
      bankName: "Nombank MFB",
      accountNumber: "0123456789",
    },
  },
};

const sendToApi = process.argv.includes("--send");

function printSignedRequest() {
  const { signature, timestamp } = signNombaWebhook(
    payload,
    env.nombaWebhookSecret,
  );

  console.log("=== nomba-signature ===");
  console.log(signature);
  console.log("\n=== nomba-timestamp ===");
  console.log(timestamp);
  console.log("\n=== Body ===");
  console.log(JSON.stringify(payload, null, 2));

  return { signature, timestamp };
}

async function main() {
  const { signature, timestamp } = printSignedRequest();

  if (!sendToApi) {
    console.log(
      "\n(Dry-run — nothing sent to the API/DB. Pass --send to POST to the running server.)",
    );
    return;
  }

  const url = `http://localhost:${env.port}${env.nombaWebhookPath}`;
  console.log(`\n=== Sending webhook to ${url} ===`);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "nomba-signature": signature,
      "nomba-timestamp": timestamp,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  console.log("Status:", res.status);
  console.log("Response:", body);

  if (!res.ok) {
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nPayment event accepted. Reconciliation runs async — check the dashboard or reporting API in a few seconds.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
