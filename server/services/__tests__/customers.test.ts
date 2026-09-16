import { describe, expect, it, vi, beforeEach } from "vitest";
import { createCustomerService } from "../customers";
import type { CustomerRow } from "../../db/customers";

vi.mock("../../config/env", () => ({
  env: { nodeEnv: "test" },
}));

vi.mock("../../db/pool", () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}));

vi.mock("../../db/customers", () => ({
  businessExists: vi.fn(),
  insertCustomer: vi.fn(),
  insertCustomerWallet: vi.fn(),
  getCustomerById: vi.fn(),
}));

vi.mock("../../db/businesses", () => ({
  getBusinessById: vi.fn(),
}));

vi.mock("../../lib/email", () => ({
  sendCustomerWelcomeEmail: vi.fn(),
}));

import { pool } from "../../db/pool";
import {
  businessExists,
  getCustomerById,
  insertCustomer,
  insertCustomerWallet,
} from "../../db/customers";
import { getBusinessById } from "../../db/businesses";
import { sendCustomerWelcomeEmail } from "../../lib/email";

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
  virtual_account: null,
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
    vi.mocked(getBusinessById).mockResolvedValue({
      id: businessId,
      name: "Acme",
      metadata: {},
      created_at: "2026-06-28T10:00:00Z",
      updated_at: "2026-06-28T10:00:00Z",
    });
    vi.mocked(sendCustomerWelcomeEmail).mockResolvedValue(undefined);
  });

  it("creates customer and wallet inside a transaction", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);

    const { query, release } = mockTransactionClient();
    vi.mocked(insertCustomer).mockResolvedValue(customerRow);
    vi.mocked(insertCustomerWallet).mockResolvedValue(undefined);
    vi.mocked(getCustomerById).mockResolvedValue(createdCustomer);

    const service = createCustomerService();
    const result = await service.createCustomer({
      businessId,
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+2348010000099",
      password: "Password123!",
    });

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(insertCustomer).toHaveBeenCalled();
    expect(insertCustomerWallet).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalled();
    expect(result.virtual_account).toBeNull();
    expect(sendCustomerWelcomeEmail).toHaveBeenCalled();
  });

  it("returns 404 when business does not exist", async () => {
    vi.mocked(businessExists).mockResolvedValue(false);

    const service = createCustomerService();

    await expect(
      service.createCustomer({
        businessId,
        fullName: "Jane Doe",
        email: "jane@example.com",
        password: "Password123!",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "BUSINESS_NOT_FOUND",
    });

    expect(insertCustomer).not.toHaveBeenCalled();
  });

  it("rolls back when customer insert fails", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);
    const { query } = mockTransactionClient();
    vi.mocked(insertCustomer).mockRejectedValue(new Error("db write failed"));

    const service = createCustomerService();

    await expect(
      service.createCustomer({
        businessId,
        fullName: "Jane Doe",
        email: "jane@example.com",
        password: "Password123!",
      }),
    ).rejects.toThrow("db write failed");

    expect(query).toHaveBeenCalledWith("ROLLBACK");
    expect(insertCustomerWallet).not.toHaveBeenCalled();
  });
});
