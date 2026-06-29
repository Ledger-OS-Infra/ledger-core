import { describe, expect, it } from "vitest";
import {
  formatObligation,
  type PaymentObligationRow,
} from "../format";
import {
  deriveObligationStatus,
  outstandingBalance,
} from "../status";
import { ngnToKobo } from "../../money";

describe("outstandingBalance", () => {
  it("returns amount minus amount paid (kobo)", () => {
    expect(
      outstandingBalance(ngnToKobo(150_000), ngnToKobo(70_000)),
    ).toBe(ngnToKobo(80_000));
  });

  it("never returns negative values", () => {
    expect(outstandingBalance(ngnToKobo(6_000), ngnToKobo(7_000))).toBe(0);
  });
});

describe("deriveObligationStatus", () => {
  const referenceDate = new Date("2026-06-15T12:00:00.000Z");

  it("returns UNPAID when nothing is paid and due date is in the future", () => {
    expect(
      deriveObligationStatus(
        ngnToKobo(150_000),
        0,
        "2026-07-01",
        referenceDate,
      ),
    ).toBe("UNPAID");
  });

  it("returns PARTIAL when partially paid", () => {
    expect(
      deriveObligationStatus(
        ngnToKobo(150_000),
        ngnToKobo(70_000),
        "2026-05-15",
        referenceDate,
      ),
    ).toBe("PARTIAL");
  });

  it("returns PAID when fully paid", () => {
    expect(
      deriveObligationStatus(
        ngnToKobo(150_000),
        ngnToKobo(150_000),
        "2026-05-15",
        referenceDate,
      ),
    ).toBe("PAID");
  });

  it("returns OVERDUE when unpaid and past due", () => {
    expect(
      deriveObligationStatus(ngnToKobo(6_000), 0, "2026-06-01", referenceDate),
    ).toBe("OVERDUE");
  });
});

describe("formatObligation", () => {
  it("maps database row to API shape with computed fields in kobo", () => {
    const row: PaymentObligationRow = {
      id: "11111111-1111-1111-1111-111111111401",
      business_id: "11111111-1111-1111-1111-111111111101",
      customer_id: "11111111-1111-1111-1111-111111111201",
      billing_rule_id: null,
      obligation_type: "INVOICE",
      reference_code: "INV-2026-001",
      amount: String(ngnToKobo(150_000)),
      amount_paid: String(ngnToKobo(70_000)),
      due_date: "2026-05-15",
      status: "PARTIAL",
      metadata: { description: "Project milestone invoice" },
      created_at: new Date("2026-05-01T10:00:00.000Z"),
      updated_at: new Date("2026-05-20T10:00:01.000Z"),
    };

    expect(formatObligation(row)).toEqual({
      id: row.id,
      customer_id: row.customer_id,
      business_id: row.business_id,
      billing_rule_id: null,
      type: "INVOICE",
      reference_code: "INV-2026-001",
      amount: ngnToKobo(150_000),
      amount_paid: ngnToKobo(70_000),
      outstanding_balance: ngnToKobo(80_000),
      due_date: "2026-05-15",
      status: "PARTIAL",
      metadata: { description: "Project milestone invoice" },
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    });
  });
});
