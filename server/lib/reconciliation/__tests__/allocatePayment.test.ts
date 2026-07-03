import { describe, it, expect, vi, beforeEach } from "vitest";
import { allocatePayment, deriveStatus } from "../allocatePayment";
import { makeObligation } from "../../__tests__/factories";

describe("deriveStatus", () => {
  it("returns PAID when amount_paid equals total", () => {
    expect(deriveStatus(10000, 10000)).toBe("PAID");
  });

  it("returns PAID when amount_paid exceeds total", () => {
    expect(deriveStatus(12000, 10000)).toBe("PAID");
  });

  it("returns PARTIAL when amount_paid is greater than zero but less than total", () => {
    expect(deriveStatus(5000, 10000)).toBe("PARTIAL");
  });

  it("returns UNPAID when amount_paid is zero", () => {
    expect(deriveStatus(0, 10000)).toBe("UNPAID");
  });
});

describe("allocatePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("full payment marks obligation PAID and writes ledger entry", async () => {
    const obligation = makeObligation({
      id: "ob-1",
      customer_id: "cus-1",
      amount: "10000",
      amount_paid: "0",
      status: "UNPAID",
      reference_code: "INV-2026-001",
    });

    const match = {
      obligation,
      amountToApply: 10000,
      excessAmount: 0,
      strategy: "exact" as const,
    };

    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "ledger-entry-1" }] }),
    };

    const result = await allocatePayment(match, "evt-1", client as any);

    expect(result.newStatus).toBe("PAID");
    expect(result.amountApplied).toBe(10000);
    expect(result.excessCreditedToWallet).toBe(0);
    expect(result.ledgerEntryId).toBe("ledger-entry-1");
    expect(result.walletLedgerEntryId).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it("partial payment marks obligation PARTIAL", async () => {
    const obligation = makeObligation({
      id: "ob-1",
      customer_id: "cus-1",
      amount: "10000",
      amount_paid: "0",
      status: "UNPAID",
    });

    const match = {
      obligation,
      amountToApply: 4000,
      excessAmount: 0,
      strategy: "fifo" as const,
    };

    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "ledger-entry-1" }] }),
    };

    const result = await allocatePayment(match, "evt-1", client as any);

    expect(result.newStatus).toBe("PARTIAL");
    expect(result.amountApplied).toBe(4000);
    expect(result.excessCreditedToWallet).toBe(0);
    expect(result.walletLedgerEntryId).toBeNull();
    expect(client.query).toHaveBeenCalledTimes(2);
  });

  it("overpayment marks obligation PAID and credits excess to wallet", async () => {
    const obligation = makeObligation({
      id: "ob-1",
      customer_id: "cus-1",
      amount: "10000",
      amount_paid: "0",
      status: "UNPAID",
    });

    const match = {
      obligation,
      amountToApply: 10000,
      excessAmount: 5000,
      strategy: "fifo" as const,
    };

    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "ledger-entry-1" }] })
        .mockResolvedValueOnce({ rows: [{ balance: "5000" }] })
        .mockResolvedValueOnce({ rows: [{ id: "wallet-ledger-1" }] }),
    };

    const result = await allocatePayment(match, "evt-1", client as any);

    expect(result.newStatus).toBe("PAID");
    expect(result.amountApplied).toBe(10000);
    expect(result.excessCreditedToWallet).toBe(5000);
    expect(result.ledgerEntryId).toBe("ledger-entry-1");
    expect(result.walletLedgerEntryId).toBe("wallet-ledger-1");
    expect(client.query).toHaveBeenCalledTimes(4);
  });

  it("John Doe scenario: second payment clears obligation and credits wallet", async () => {
    const obligation = makeObligation({
      id: "ob-1",
      customer_id: "cus-1",
      amount: "150000",
      amount_paid: "70000",
      status: "PARTIAL",
    });

    const match = {
      obligation,
      amountToApply: 80000,
      excessAmount: 20000,
      strategy: "fifo" as const,
    };

    const client = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: "ledger-entry-2" }] })
        .mockResolvedValueOnce({ rows: [{ balance: "20000" }] })
        .mockResolvedValueOnce({ rows: [{ id: "wallet-ledger-2" }] }),
    };

    const result = await allocatePayment(match, "evt-2", client as any);

    expect(result.newStatus).toBe("PAID");
    expect(result.amountApplied).toBe(80000);
    expect(result.excessCreditedToWallet).toBe(20000);
    expect(result.walletLedgerEntryId).toBe("wallet-ledger-2");
    expect(client.query).toHaveBeenCalledTimes(4);
  });
});