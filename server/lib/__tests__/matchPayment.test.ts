import { describe, it, expect } from "vitest";
import { matchPayment } from "../reconciliation/matchPayment";
import { makeObligation } from "./factories";

describe("matchPayment", () => {
  it("exact amount match bypasses FIFO", () => {
    const older = makeObligation({
      id: "ob-older",
      amount: "5000",
      created_at: new Date("2026-01-01"),
    });
    const exact = makeObligation({
      id: "ob-exact",
      amount: "10000",
      created_at: new Date("2026-06-01"),
    });

    const result = matchPayment(10000, [older, exact]);

    expect(result).not.toBeNull();
    expect(result!.obligation.id).toBe("ob-exact");
    expect(result!.strategy).toBe("exact");
    expect(result!.amountToApply).toBe(10000);
    expect(result!.excessAmount).toBe(0);
  });

  it("reference code match when narration contains obligation reference", () => {
    const refObligation = makeObligation({
      id: "ob-ref",
      amount: "20000",
      reference_code: "INV-2026-001",
    });
    const other = makeObligation({
      id: "ob-other",
      amount: "5000",
      created_at: new Date("2026-01-01"),
    });

    const result = matchPayment(
      15000,
      [other, refObligation],
      "Payment for INV-2026-001 from John",
    );

    expect(result).not.toBeNull();
    expect(result!.obligation.id).toBe("ob-ref");
    expect(result!.strategy).toBe("reference");
  });

  it("no exact match falls through to FIFO", () => {
    const oldest = makeObligation({
      id: "ob-oldest",
      amount: "8000",
      created_at: new Date("2026-01-01"),
    });
    const newer = makeObligation({
      id: "ob-newer",
      amount: "12000",
      created_at: new Date("2026-06-01"),
    });

    const result = matchPayment(5000, [newer, oldest]);

    expect(result).not.toBeNull();
    expect(result!.obligation.id).toBe("ob-oldest");
    expect(result!.strategy).toBe("fifo");
  });

  it("partial payment with no exact match assigns to oldest obligation", () => {
    const oldest = makeObligation({
      id: "ob-oldest",
      amount: "50000",
      amount_paid: "20000",
      status: "PARTIAL",
      created_at: new Date("2026-01-01"),
    });
    const newer = makeObligation({
      id: "ob-newer",
      amount: "30000",
      created_at: new Date("2026-06-01"),
    });

    const result = matchPayment(10000, [newer, oldest]);

    expect(result).not.toBeNull();
    expect(result!.obligation.id).toBe("ob-oldest");
    expect(result!.strategy).toBe("fifo");
    expect(result!.amountToApply).toBe(10000);
    expect(result!.excessAmount).toBe(0);
  });

  it("overpayment on a single obligation returns correct excess", () => {
    const obligation = makeObligation({
      id: "ob-1",
      amount: "10000",
      amount_paid: "0",
    });

    const result = matchPayment(15000, [obligation]);

    expect(result).not.toBeNull();
    expect(result!.amountToApply).toBe(10000);
    expect(result!.excessAmount).toBe(5000);
  });

  it("returns null when obligations array is empty", () => {
    const result = matchPayment(10000, []);
    expect(result).toBeNull();
  });
});
