import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import type { QueryResult, QueryResultRow } from "pg";
import { findCustomerByAccountNumber } from "../customers";

vi.mock("../pool", () => ({
  pool: {
    query: vi.fn<
      (queryText: string, values?: unknown[]) => Promise<QueryResult>
    >(),
  },
}));

import { pool } from "../pool";

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

describe("findCustomerByAccountNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns customer joined with active virtual account", async () => {
    mockPoolQuery().mockResolvedValue(
      queryResult([
        {
          id: "11111111-1111-1111-1111-111111111201",
          business_id: "11111111-1111-1111-1111-111111111101",
          full_name: "John Doe",
          email: "john.doe@example.com",
          phone: "+2348010000001",
          status: "ACTIVE",
          metadata: {},
          created_at: new Date("2026-06-01T00:00:00Z"),
          updated_at: new Date("2026-06-01T00:00:00Z"),
          va_id: "11111111-1111-1111-1111-111111111301",
          va_customer_id: "11111111-1111-1111-1111-111111111201",
          va_nomba_account_ref: "seed_john_doe",
          va_account_number: "8112340001",
          va_bank_name: "Nomba MFB",
          va_bank_code: "090645",
          va_is_active: true,
          va_created_at: new Date("2026-06-01T00:00:00Z"),
        },
      ]),
    );

    const customer = await findCustomerByAccountNumber("8112340001");

    expect(customer).toMatchObject({
      full_name: "John Doe",
      virtual_account: {
        account_number: "8112340001",
        nomba_account_ref: "seed_john_doe",
        is_active: true,
      },
    });

    expect(mockPoolQuery()).toHaveBeenCalledWith(
      expect.stringContaining("va.account_number = $1"),
      ["8112340001"],
    );
    expect(mockPoolQuery()).toHaveBeenCalledWith(
      expect.stringContaining("va.is_active = TRUE"),
      ["8112340001"],
    );
  });

  it("returns null when no active virtual account matches", async () => {
    mockPoolQuery().mockResolvedValue(queryResult([]));

    const customer = await findCustomerByAccountNumber("0000000000");
    expect(customer).toBeNull();
  });
});
