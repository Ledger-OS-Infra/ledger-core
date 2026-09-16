import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../config/env", () => ({
  env: {
    flutterwaveConfig: {
      secretHash: "test-webhook-secret",
      webhookPath: "/webhooks/flutterwave",
    },
    nodeEnv: "test",
  },
}));

vi.mock("../../idempotency/claimEvent", () => ({
  claimEvent: vi.fn(),
  releaseEvent: vi.fn(),
}));

vi.mock("../../db/customers", () => ({
  findCustomerByAccountNumber: vi.fn(),
  findCustomerByAccountRef: vi.fn(),
}));

vi.mock("../../db/paymentEvents", () => ({
  insertPaymentEvent: vi.fn(),
}));

vi.mock("../../queues/reconciliation", () => ({
  enqueueReconciliationJob: vi.fn(),
}));

vi.mock("../../lib/reconciliation/processPaymentEvent", () => ({
  processPaymentEvent: vi.fn(),
}));

vi.mock("@sentry/node", () => ({
  addBreadcrumb: vi.fn(),
  withScope: vi.fn(
    (fn: (scope: { setTag: () => void; setContext: () => void }) => void) => {
      fn({ setTag: vi.fn(), setContext: vi.fn() });
    },
  ),
  captureException: vi.fn(),
}));

import { webhooksRouter } from "../webhooks";
import { claimEvent } from "../../idempotency/claimEvent";
import {
  findCustomerByAccountNumber,
  findCustomerByAccountRef,
} from "../../db/customers";
import { insertPaymentEvent } from "../../db/paymentEvents";
import { enqueueReconciliationJob } from "../../queues/reconciliation";
import { resetPaymentProvider } from "../../payments";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(webhooksRouter);
  return app;
}

const payload = {
  event: "charge.completed",
  data: {
    id: 2028146660,
    tx_ref: "seed_john_doe",
    flw_ref: "flw_ref_123",
    amount: 50,
    status: "successful",
    narration: "Invoice",
  },
  meta_data: {
    originatorname: "Jane Sender",
    originatoraccountnumber: "0123456789",
  },
  "event.type": "BANK_TRANSFER_TRANSACTION",
};

describe("POST /webhooks/flutterwave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPaymentProvider();
    vi.mocked(claimEvent).mockResolvedValue(true);
    vi.mocked(enqueueReconciliationJob).mockResolvedValue(undefined);
    vi.mocked(findCustomerByAccountNumber).mockResolvedValue(null);
  });

  it("persists matched events and enqueues reconciliation without blocking response", async () => {
    vi.mocked(findCustomerByAccountRef).mockResolvedValue({
      id: "cus-1",
      business_id: "biz-1",
      full_name: "John Doe",
      email: null,
      phone: null,
      status: "ACTIVE",
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      virtual_account: {
        id: "va-1",
        customer_id: "cus-1",
        account_ref: "seed_john_doe",
        account_number: "8112340001",
        bank_name: "Flutterwave MFB",
        bank_code: "090567",
        is_active: true,
        created_at: new Date(),
      },
    });

    vi.mocked(insertPaymentEvent).mockResolvedValue({
      id: "pe-1",
      business_id: "biz-1",
      virtual_account_id: "va-1",
      idempotency_key: "flw_ref_123",
      amount: 5000,
      sender_name: "Jane Sender",
      sender_account: "0123456789",
      raw_payload: payload,
      received_at: new Date(),
      is_matched: true,
      created_at: new Date(),
    });

    const res = await request(buildApp())
      .post("/webhooks/flutterwave")
      .set("verif-hash", "test-webhook-secret")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(findCustomerByAccountRef).toHaveBeenCalledWith("seed_john_doe");
    expect(insertPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "flw_ref_123",
        transactionAmount: 5000,
        virtualAccountId: "va-1",
        businessId: "biz-1",
        isMatched: true,
        senderName: "Jane Sender",
        senderAccount: "0123456789",
      }),
    );
    expect(enqueueReconciliationJob).toHaveBeenCalledWith({
      paymentEventId: "pe-1",
    });
  });

  it("persists unknown virtual accounts as unmatched without enqueueing", async () => {
    vi.mocked(findCustomerByAccountRef).mockResolvedValue(null);
    vi.mocked(insertPaymentEvent).mockResolvedValue({
      id: "pe-2",
      business_id: null,
      virtual_account_id: null,
      idempotency_key: "flw_ref_123",
      amount: 5000,
      sender_name: "Jane Sender",
      sender_account: "0123456789",
      raw_payload: payload,
      received_at: new Date(),
      is_matched: false,
      created_at: new Date(),
    });

    const res = await request(buildApp())
      .post("/webhooks/flutterwave")
      .set("verif-hash", "test-webhook-secret")
      .send(payload);

    expect(res.status).toBe(200);
    expect(insertPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionAmount: 5000,
        virtualAccountId: null,
        businessId: null,
        isMatched: false,
      }),
    );
    expect(enqueueReconciliationJob).not.toHaveBeenCalled();
  });

  it("rejects requests with a missing or invalid verif-hash", async () => {
    const res = await request(buildApp())
      .post("/webhooks/flutterwave")
      .send(payload);

    expect(res.status).toBe(401);
    expect(insertPaymentEvent).not.toHaveBeenCalled();
  });
});
