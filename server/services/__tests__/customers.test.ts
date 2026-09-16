import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "../../lib/AppError";
import { createCustomerService } from "../customers";

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
  sendCustomerWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}));

import { pool } from "../../db/pool";
import {
  businessExists,
  getCustomerById,
  insertCustomer,
  insertCustomerWallet,
} from "../../db/customers";

const businessId = "11111111-1111-1111-1111-111111111101";
const customerId = "22222222-2222-2222-2222-222222222201";

const createdCustomer = {
  id: customerId,
  business_id: businessId,
  full_name: "Jane Doe",
  email: "jane@example.com",
  phone: "+2348010000099",
  status: "ACTIVE",
  metadata: {},
  created_at: new Date("2026-06-28T10:00:00Z"),
  updated_at: new Date("2026-06-28T10:00:00Z"),
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
  });

  it("creates customer and wallet inside a transaction", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);
    const { query, release } = mockTransactionClient();
    vi.mocked(insertCustomer).mockResolvedValue(undefined as never);
    vi.mocked(insertCustomerWallet).mockResolvedValue(undefined as never);
    vi.mocked(getCustomerById).mockResolvedValue(createdCustomer as never);

    const service = createCustomerService();
    const result = await service.createCustomer({
      businessId,
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+2348010000099",
      password: "password123",
    });

    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(insertCustomer).toHaveBeenCalled();
    expect(insertCustomerWallet).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalled();
    expect(result.id).toBe(customerId);
  });

  it("returns 404 when business does not exist", async () => {
    vi.mocked(businessExists).mockResolvedValue(false);

    const service = createCustomerService();

    await expect(
      service.createCustomer({
        businessId,
        fullName: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "BUSINESS_NOT_FOUND",
    });
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
        password: "password123",
      }),
    ).rejects.toThrow("db write failed");

    expect(query).toHaveBeenCalledWith("ROLLBACK");
  });
});