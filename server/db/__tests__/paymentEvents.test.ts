import { describe, it, expect, vi } from "vitest";

vi.mock("../pool", () => ({ pool: {} }));

import { insertPaymentEvent } from "../paymentEvents";

describe("insertPaymentEvent", () => {
  it("inserts a matched payment event with all fields", async () => {
    const mockRow = {
      id: "evt-1",
      business_id: "biz-1",
      virtual_account_id: "va-1",
      idempotency_key: "txn_123",
      amount: 5000,
      sender_name: "Jane Sender",
      sender_account: "0123456789",
      raw_payload: { event_type: "payment_success" },
      received_at: new Date(),
      is_matched: true,
      created_at: new Date(),
    };

    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [mockRow] }),
    };

    const result = await insertPaymentEvent(
      {
        transactionId: "txn_123",
        transactionAmount: 5000,
        virtualAccountId: "va-1",
        businessId: "biz-1",
        isMatched: true,
        senderName: "Jane Sender",
        senderAccount: "0123456789",
        rawPayload: { event_type: "payment_success" },
        receivedAt: new Date(),
      },
      mockClient as any,
    );

    expect(result).toEqual(mockRow);
    expect(mockClient.query).toHaveBeenCalledTimes(1);

    const [, params] = mockClient.query.mock.calls[0];
    expect(params[0]).toBe("biz-1");
    expect(params[1]).toBe("va-1");
    expect(params[2]).toBe("txn_123");
    expect(params[8]).toBe(true);
  });

  it("inserts an unmatched payment event with null business and VA ids", async () => {
    const mockRow = {
      id: "evt-2",
      business_id: null,
      virtual_account_id: null,
      idempotency_key: "txn_456",
      amount: 1000,
      sender_name: null,
      sender_account: null,
      raw_payload: { event_type: "payment_success" },
      received_at: new Date(),
      is_matched: false,
      created_at: new Date(),
    };

    const mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [mockRow] }),
    };

    const result = await insertPaymentEvent(
      {
        transactionId: "txn_456",
        transactionAmount: 1000,
        isMatched: false,
        rawPayload: { event_type: "payment_success" },
        receivedAt: new Date(),
      },
      mockClient as any,
    );

    expect(result.business_id).toBeNull();
    expect(result.virtual_account_id).toBeNull();
    expect(result.is_matched).toBe(false);

    const [, params] = mockClient.query.mock.calls[0];
    expect(params[0]).toBeNull();
    expect(params[1]).toBeNull();
    expect(params[8]).toBe(false);
  });
});