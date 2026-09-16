import { describe, expect, it, vi, beforeEach } from "vitest";
import { createCustomerService } from "../customers";
import type { CustomerRow } from "../../db/customers";
import type { PaymentProvider } from "../../payments";

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
  insertVirtualAccount: vi.fn(),
  getCustomerById: vi.fn(),
}));

vi.mock("../../db/businesses", () => ({
  getBusinessById: vi.fn(),
}));

vi.mock("../../lib/email", () => ({
  sendCustomerWelcomeEmail: vi.fn(),
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
  insertVirtualAccount,
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
  virtual_account: {
    id: "va-1",
    customer_id: customerId,
    account_ref: "lc_ref",
    account_number: "9587478607",
    bank_name: "Flutterwave MFB",
    bank_code: null,
    is_active: true,
    created_at: new Date("2026-06-28T10:00:00Z"),
  },
};

function mockPayments(
  overrides: Partial<PaymentProvider> = {},
): PaymentProvider {
  return {
    createVirtualAccount: vi.fn().mockResolvedValue({
      accountNumber: "9587478607",
      bankName: "Flutterwave MFB",
      accountRef: "lc_ref",
      providerResponse: {},
    }),
    verifyWebhookSignature: vi.fn(),
    isCreditableWebhook: vi.fn(),
    parseWebhookPayload: vi.fn(),
    getIdempotencyKey: vi.fn(),
    ...overrides,
  };
}

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

  it("creates customer, dynamic VA, and wallet inside a transaction", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);

    const { query, release } = mockTransactionClient();
    const payments = mockPayments();
    vi.mocked(insertCustomer).mockResolvedValue(customerRow);
    vi.mocked(insertVirtualAccount).mockResolvedValue(
      createdCustomer.virtual_account,
    );
    vi.mocked(insertCustomerWallet).mockResolvedValue(undefined);
    vi.mocked(getCustomerById).mockResolvedValue(createdCustomer);

    const service = createCustomerService(payments);
    const result = await service.createCustomer({
      businessId,
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+2348010000099",
      password: "Password123!",
    });

    expect(payments.createVirtualAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Jane Doe",
        email: "jane@example.com",
        phone: "+2348010000099",
      }),
    );
    expect(query).toHaveBeenCalledWith("BEGIN");
    expect(insertCustomer).toHaveBeenCalled();
    expect(insertVirtualAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountNumber: "9587478607",
        bankName: "Flutterwave MFB",
      }),
      expect.anything(),
    );
    expect(insertCustomerWallet).toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith("COMMIT");
    expect(release).toHaveBeenCalled();
    expect(result.virtual_account?.account_number).toBe("9587478607");
    expect(sendCustomerWelcomeEmail).toHaveBeenCalled();
  });

  it("returns 404 when business does not exist", async () => {
    vi.mocked(businessExists).mockResolvedValue(false);
    const payments = mockPayments();

    const service = createCustomerService(payments);

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

    expect(payments.createVirtualAccount).not.toHaveBeenCalled();
    expect(insertCustomer).not.toHaveBeenCalled();
  });

  it("rolls back when customer insert fails", async () => {
    vi.mocked(businessExists).mockResolvedValue(true);
    const { query } = mockTransactionClient();
    vi.mocked(insertCustomer).mockRejectedValue(new Error("db write failed"));

    const service = createCustomerService(mockPayments());

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
