import { describe, expect, it } from "vitest";
import { AppError } from "../../AppError";
import { ngnToKobo } from "../../money";
import type { PaymentObligationRow } from "../format";
import {
  buildObligationUpdatePatch,
  validateObligationUpdate,
} from "../update";

const existingRow = (
  overrides: Partial<PaymentObligationRow> = {},
): PaymentObligationRow => ({
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
  metadata: {},
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe("validateObligationUpdate", () => {
  it("allows metadata updates when partially paid", () => {
    expect(() =>
      validateObligationUpdate(existingRow(), {
        metadata: { note: "updated" },
      }),
    ).not.toThrow();
  });

  it("rejects type change after payments", () => {
    expect(() =>
      validateObligationUpdate(existingRow(), { type: "SUBSCRIPTION" }),
    ).toThrowError(
      expect.objectContaining({
        code: "OBLIGATION_IMMUTABLE",
      } satisfies Partial<AppError>),
    );
  });

  it("rejects amount change after payments", () => {
    expect(() =>
      validateObligationUpdate(existingRow(), { amount: ngnToKobo(160_000) }),
    ).toThrowError(
      expect.objectContaining({ code: "OBLIGATION_IMMUTABLE" }),
    );
  });

  it("rejects amount below amount paid", () => {
    expect(() =>
      validateObligationUpdate(
        existingRow({ amount_paid: "0" }),
        { amount: ngnToKobo(1_000) },
      ),
    ).not.toThrow();

    expect(() =>
      validateObligationUpdate(existingRow(), { amount: ngnToKobo(50_000) }),
    ).toThrowError(
      expect.objectContaining({ code: "OBLIGATION_AMOUNT_CONFLICT" }),
    );
  });
});

describe("buildObligationUpdatePatch", () => {
  it("builds SQL assignments only for provided fields", () => {
    expect(
      buildObligationUpdatePatch({
        dueDate: "2026-08-01",
        referenceCode: "INV-2026-002",
      }),
    ).toEqual({
      assignments: ["due_date = $1", "reference_code = $2"],
      values: ["2026-08-01", "INV-2026-002"],
    });
  });

  it("serializes metadata as jsonb", () => {
    const patch = buildObligationUpdatePatch({
      metadata: { period: "2026-08" },
    });

    expect(patch.assignments).toEqual(["metadata = $1::jsonb"]);
    expect(patch.values).toEqual([JSON.stringify({ period: "2026-08" })]);
  });
});

