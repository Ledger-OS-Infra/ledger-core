import type { PaymentObligationRow } from "../obligations/format";

export function makeObligation(
  overrides: Partial<PaymentObligationRow> = {},
): PaymentObligationRow {
  return {
    id: "ob-1",
    business_id: "biz-1",
    customer_id: "cus-1",
    billing_rule_id: null,
    obligation_type: "INVOICE",
    reference_code: null,
    amount: "10000",
    amount_paid: "0",
    due_date: "2026-08-01",
    status: "UNPAID",
    metadata: {},
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    ...overrides,
  };
}