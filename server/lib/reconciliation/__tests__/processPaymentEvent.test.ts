import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import type { QueryResult, QueryResultRow } from "pg";
import { makeObligation } from "../../__tests__/factories";
import { matchPayment } from "../matchPayment";

vi.mock("../../../db/paymentEvents", () => ({
  getPaymentEventById: vi.fn(),
}));

vi.mock("../../../db/obligations", () => ({
  listUnsettledObligationsByCustomer: vi.fn(),
}));

vi.mock("../../../db/pool", () => ({
  pool: {
    query: vi.fn<
      (queryText: string, values?: unknown[]) => Promise<QueryResult>
    >(),
    connect: vi.fn(),
  },
}));

vi.mock("../allocatePayment", () => ({
  allocatePayment: vi.fn(),
}));

import { getPaymentEventById } from "../../../db/paymentEvents";
import { listUnsettledObligationsByCustomer } from "../../../db/obligations";
import { pool } from "../../../db/pool";
import { allocatePayment } from "../allocatePayment";
import { processPaymentEvent } from "../processPaymentEvent";

type PoolQuery = (
  queryText: string,
  values?: unknown[],
) => Promise<QueryResult>;

function mockPoolQuery(): Mock<PoolQuery> {
  return pool.query as unknown as Mock<PoolQuery>;
}

function queryResult<T extends QueryResultRow>(rows: T[]): QueryResult<T> {
  return {
    rows,
    rowCount: rows.length,
    command: "SELECT",
    oid: 0,
    fields: [],
  };
}

describe("processPaymentEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips unmatched payment events", async () => {
    vi.mocked(getPaymentEventById).mockResolvedValue({
      id: "pe-1",
      business_id: null,
      virtual_account_id: null,
      idempotency_key: "txn-1",
      amount: 5000,
      sender_name: null,
      sender_account: null,
      raw_payload: {},
      received_at: new Date(),
      is_matched: false,
      created_at: new Date(),
    });

    const result = await processPaymentEvent("pe-1");

    expect(result).toEqual({
      paymentEventId: "pe-1",
      status: "skipped_unmatched",
    });
    expect(listUnsettledObligationsByCustomer).not.toHaveBeenCalled();
  });

  it("allocates payment when a match is found", async () => {
    const obligation = makeObligation({
      id: "ob-1",
      customer_id: "cus-1",
      amount: "5000",
      amount_paid: "0",
      status: "UNPAID",
    });

    vi.mocked(getPaymentEventById).mockResolvedValue({
      id: "pe-1",
      business_id: "biz-1",
      virtual_account_id: "va-1",
      idempotency_key: "txn-1",
      amount: 5000,
      sender_name: "Jane",
      sender_account: "0123456789",
      raw_payload: {
        data: { transaction: { aliasAccountReference: "INV-001" } },
      },
      received_at: new Date(),
      is_matched: true,
      created_at: new Date(),
    });

    mockPoolQuery().mockResolvedValue(
      queryResult([{ customer_id: "cus-1" }]),
    );

    vi.mocked(listUnsettledObligationsByCustomer).mockResolvedValue([obligation]);

    const client = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(pool.connect).mockResolvedValue(client as never);

    const match = matchPayment(5000, [obligation], "INV-001");
    expect(match).not.toBeNull();

    vi.mocked(allocatePayment).mockResolvedValue({
      obligationId: "ob-1",
      newStatus: "PAID",
      amountApplied: 5000,
      excessCreditedToWallet: 0,
      ledgerEntryId: "le-1",
      walletLedgerEntryId: null,
    });

    const result = await processPaymentEvent("pe-1");

    expect(result).toMatchObject({
      paymentEventId: "pe-1",
      status: "allocated",
      obligationId: "ob-1",
    });
    expect(allocatePayment).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: "exact" }),
      "pe-1",
      client,
    );
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
  });
});
