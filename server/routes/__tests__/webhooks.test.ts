import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../config/env", () => ({
  env: {
    nombaWebhookPath: "/webhooks/nomba",
    nombaWebhookSecret: "test-webhook-secret",
  },
}));

vi.mock("../../nomba/verifyWebhookSignature", () => ({
  verifyNombaWebhookSignature: vi.fn(() => true),
}));

vi.mock("../../idempotency/claimEvent", () => ({
  claimEvent: vi.fn(),
  releaseEvent: vi.fn(),
}));

vi.mock("../../db/customers", () => ({
  findCustomerByAccountNumber: vi.fn(),
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
  withScope: vi.fn((fn: (scope: { setTag: () => void; setContext: () => void }) => void) => {
    fn({ setTag: vi.fn(), setContext: vi.fn() });
  }),
  captureException: vi.fn(),
}));

import { webhooksRouter } from "../webhooks";
import { claimEvent } from "../../idempotency/claimEvent";
import { findCustomerByAccountNumber } from "../../db/customers";
import { insertPaymentEvent } from "../../db/paymentEvents";
import { enqueueReconciliationJob } from "../../queues/reconciliation";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(webhooksRouter);
  return app;
}

const payload = {
  event_type: "payment_success",
  requestId: "req-1",
  data: {
    merchant: { userId: "u1", walletId: "w1" },
    transaction: {
      transactionId: "txn-123",
      type: "virtual_account_credit",
      time: "2026-06-27T20:00:00.000Z",
      responseCode: "00",
      aliasAccountNumber: "8112340001",
      aliasAccountReference: "INV-001",
      transactionAmount: 50,
    },
    customer: {
      senderName: "Jane Sender",
      accountNumber: "0123456789",
    },
  },
};

describe("POST /webhooks/nomba", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(claimEvent).mockResolvedValue(true);
    vi.mocked(enqueueReconciliationJob).mockResolvedValue(undefined);
  });

  it("persists matched events and enqueues reconciliation without blocking response", async () => {
    vi.mocked(findCustomerByAccountNumber).mockResolvedValue({
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
        nomba_account_ref: "ref-1",
        account_number: "8112340001",
        bank_name: "Nomba MFB",
        bank_code: "090645",
        is_active: true,
        created_at: new Date(),
      },
    });

    vi.mocked(insertPaymentEvent).mockResolvedValue({
      id: "pe-1",
      business_id: "biz-1",
      virtual_account_id: "va-1",
      idempotency_key: "txn-123",
      amount: 5000,
      sender_name: "Jane Sender",
      sender_account: "0123456789",
      raw_payload: payload,
      received_at: new Date(),
      is_matched: true,
      created_at: new Date(),
    });

    const res = await request(buildApp())
      .post("/webhooks/nomba")
      .set("nomba-signature", "sig")
      .set("nomba-timestamp", "1234567890")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(findCustomerByAccountNumber).toHaveBeenCalledWith("8112340001");
    expect(insertPaymentEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: "txn-123",
        transactionAmount: 5000,
        virtualAccountId: "va-1",
        businessId: "biz-1",
        isMatched: true,
      }),
    );
    expect(enqueueReconciliationJob).toHaveBeenCalledWith({
      paymentEventId: "pe-1",
    });
  });

  it("persists unknown virtual accounts as unmatched without enqueueing", async () => {
    vi.mocked(findCustomerByAccountNumber).mockResolvedValue(null);
    vi.mocked(insertPaymentEvent).mockResolvedValue({
      id: "pe-2",
      business_id: null,
      virtual_account_id: null,
      idempotency_key: "txn-123",
      amount: 5000,
      sender_name: "Jane Sender",
      sender_account: "0123456789",
      raw_payload: payload,
      received_at: new Date(),
      is_matched: false,
      created_at: new Date(),
    });

    const res = await request(buildApp())
      .post("/webhooks/nomba")
      .set("nomba-signature", "sig")
      .set("nomba-timestamp", "1234567890")
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
});
