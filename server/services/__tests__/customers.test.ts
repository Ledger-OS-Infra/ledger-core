import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "../../lib/AppError";
import { createCustomerService } from "../customers";
import type { NombaClient } from "../../nomba/client";
import { NombaValidationError } from "../../nomba/errors";

vi.mock("../../db/pool", () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock("../../db/customers", () => ({
  businessExists: vi.fn(),
  insertCustomer: vi.fn(),
  insertVirtualAccount: vi.fn(),
  insertCustomerWallet: vi.fn(),
  getCustomerById: vi.fn(),
}));

import { pool } from "../../db/pool";
import {
  businessExists,
  getCustomerById,
  insertCustomer,
  insertCustomerWallet,
  insertVirtualAccount,
  type CustomerRow,
} from "../../db/customers";

const mockNombaClient = {
  createCustomerVirtualAccount: vi.fn(),
  getVirtualAccount: vi.fn(),
  deactivateVirtualAccount: vi.fn(),
} as unknown as NombaClient;

const businessId = "11111111-1111-1111-1111-111111111101";
const customerId = "22222222-2222-2222-2222-222222222201";

const customerRow: CustomerRow = {
  id: customerId,
  business_id: businessId,
  full_name: "Jane Doe",
  email: "jane@example.com",
  phone: "+2348010000099",
  status: "ACTIVE",
  metadata: {},
  created_at: new Date("2026-06-28T10:00:00Z"),
  updated_at: new Date("2026-06-28T10:00:00Z"),
};

const createdCustomer = {
  ...customerRow,
  virtual_account: {
    id: "33333333-3333-3333-3333-333333333301",
    customer_id: customerId,
    nomba_account_ref: "lc_222222222222222222222222222201",
    account_number: "91714245345",
    bank_name: "Amucha MFB",
    bank_code: null,
    is_active: true,
    created_at: new Date("2026-06-28T10:00:00Z"),
  },
};

const nombaVirtualAccount = {
  createdAt: "2026-06-28T10:00:00Z",
  accountHolderId: "holder",
  accountRef: "lc_222222222222222222222222222201",
  accountName: "Jane Doe",
  currency: "NGN" as const,
  bankAccountNumber: "91714245345",
  bankName: "Amucha MFB",
};

function mockTransactionClient() {
  const query = vi.fn().mockResolvedValue(undefined);
  const release = vi.fn();
  vi.mocked(pool.connect).mockResolvedValue({
    query,
    release,
  } as never);

  return { query, release };
}

describe("CustomerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockNombaClient.deactivateVirtualAccount).mockResolvedValue({
      expired: true,
    });
  });

  it("creates customer inside transaction before provisioning Nomba VA", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);
    vi.mocked(mockNombaClient.createCustomerVirtualAccount).mockResolvedValue(
      nombaVirtualAccount,
    );

    const { query, release } = mockTransactionClient();
    vi.mocked(insertCustomer).mockResolvedValue(customerRow);
    vi.mocked(insertVirtualAccount).mockResolvedValue(createdCustomer.virtual_account);
    vi.mocked(getCustomerById).mockResolvedValue(createdCustomer);

    const service = createCustomerService(mockNombaClient);
    const result = await service.createCustomer({
      businessId,
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+2348010000099",
    });

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(insertCustomer).toHaveBeenCalled();
    expect(mockNombaClient.createCustomerVirtualAccount).toHaveBeenCalledWith({
      accountRef: expect.stringMatching(/^lc_[0-9a-f]{32}$/),
      accountName: "Jane Doe",
    });
    expect(insertVirtualAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountNumber: "91714245345",
        bankName: "Amucha MFB",
        nombaAccountRef: "lc_222222222222222222222222222201",
      }),
      expect.anything(),
    );
    expect(insertCustomerWallet).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(mockNombaClient.deactivateVirtualAccount).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalled();
    expect(result.virtual_account.account_number).toBe("91714245345");
  });

  it("returns 404 when business does not exist", async () => {
    vi.mocked(businessExists).mockResolvedValue(false);

    const service = createCustomerService(mockNombaClient);

    await expect(
      service.createCustomer({
        businessId,
        fullName: "Jane Doe",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "BUSINESS_NOT_FOUND",
    });

    expect(mockNombaClient.createCustomerVirtualAccount).not.toHaveBeenCalled();
  });

  it("rolls back without calling Nomba when customer insert fails", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);
    const { query } = mockTransactionClient();
    vi.mocked(insertCustomer).mockRejectedValue(new Error("db write failed"));

    const service = createCustomerService(mockNombaClient);

    await expect(
      service.createCustomer({
        businessId,
        fullName: "Jane Doe",
      }),
    ).rejects.toThrow("db write failed");

    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(mockNombaClient.createCustomerVirtualAccount).not.toHaveBeenCalled();
    expect(mockNombaClient.deactivateVirtualAccount).not.toHaveBeenCalled();
  });

  it("rolls back and maps Nomba validation errors without persisting", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);
    const { query } = mockTransactionClient();
    vi.mocked(insertCustomer).mockResolvedValue(customerRow);
    vi.mocked(mockNombaClient.createCustomerVirtualAccount).mockRejectedValue(
      new NombaValidationError("Invalid accountRef", 400, "400"),
    );

    const service = createCustomerService(mockNombaClient);

    await expect(
      service.createCustomer({
        businessId,
        fullName: "Jane Doe",
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(insertVirtualAccount).not.toHaveBeenCalled();
    expect(mockNombaClient.deactivateVirtualAccount).not.toHaveBeenCalled();
  });

  it("expires Nomba VA when persistence fails after provisioning", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);
    vi.mocked(mockNombaClient.createCustomerVirtualAccount).mockResolvedValue(
      nombaVirtualAccount,
    );

    const { query } = mockTransactionClient();
    vi.mocked(insertCustomer).mockResolvedValue(customerRow);
    vi.mocked(insertVirtualAccount).mockRejectedValue(new Error("va insert failed"));

    const service = createCustomerService(mockNombaClient);

    await expect(
      service.createCustomer({
        businessId,
        fullName: "Jane Doe",
      }),
    ).rejects.toThrow("va insert failed");

    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(mockNombaClient.deactivateVirtualAccount).toHaveBeenCalledWith(
      "lc_222222222222222222222222222201",
    );
  });
});
