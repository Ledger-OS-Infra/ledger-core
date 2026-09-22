import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request } from "express";
import { FlutterwaveProvider, flutterwaveSdkBaseUrl } from "../flutterwave";
import type { FlutterwaveSdk } from "../flutterwave";

vi.mock("../../config/env", () => ({
  env: {
    flutterwaveConfig: {
      environment: "sandbox",
      baseUrl: "https://api.flutterwave.com",
      publicKey: "FLWPUBK_TEST-public",
      secretKey: "FLWSECK_TEST-secret",
      encryptionKey: "enc-key",
      secretHash: "webhook-hash",
      webhookPath: "/webhooks/flutterwave",
    },
  },
}));

const chargeCompletedWebhook = {
  event: "charge.completed",
  data: {
    id: 2028146660,
    tx_ref: "seed_john_doe",
    flw_ref: "100004260420103413157701995493",
    amount: 100,
    currency: "NGN",
    narration: "FOR TESTING PURPOSE",
    status: "successful",
    payment_type: "bank_transfer",
  },
  meta_data: {
    originatorname: "ADEDOTUN OBATOMI",
    bankname: "OPAY",
    originatoraccountnumber: "813*******00",
  },
  "event.type": "BANK_TRANSFER_TRANSACTION",
};

function mockSdk(create = vi.fn()): FlutterwaveSdk {
  return { VirtualAcct: { create } };
}

describe("flutterwaveSdkBaseUrl", () => {
  it("normalizes v3 hosts for the Node SDK", () => {
    expect(flutterwaveSdkBaseUrl("https://api.flutterwave.com")).toBe(
      "https://api.flutterwave.com/",
    );
    expect(flutterwaveSdkBaseUrl("https://api.flutterwave.com/v3")).toBe(
      "https://api.flutterwave.com/",
    );
  });
});

describe("FlutterwaveProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a dynamic virtual account through flutterwave-node-v3", async () => {
    const create = vi.fn().mockResolvedValue({
      status: "success",
      data: {
        account_number: "9587478607",
        bank_name: "Flutterwave MFB",
        order_ref: "URF_1",
      },
    });
    const provider = new FlutterwaveProvider(mockSdk(create));

    const result = await provider.createVirtualAccount({
      customerId: "cus-1",
      fullName: "Jane Doe",
      accountRef: "va_jane",
      email: "jane@example.com",
      phone: "+2348010000099",
    });

    expect(create).toHaveBeenCalledWith({
      email: "jane@example.com",
      tx_ref: "va_jane",
      is_permanent: false,
      narration: "Jane Doe",
      amount: 100,
    });
    expect(result).toMatchObject({
      accountNumber: "9587478607",
      bankName: "Flutterwave MFB",
      accountRef: "va_jane",
    });
  });

  it("verifies the v3 verif-hash header against the dashboard secret hash", () => {
    const provider = new FlutterwaveProvider(mockSdk());
    const req = {
      headers: { "verif-hash": "webhook-hash" },
    } as unknown as Request;

    expect(provider.verifyWebhookSignature(req)).toBe(true);
    expect(
      provider.verifyWebhookSignature({
        headers: { "verif-hash": "wrong" },
      } as unknown as Request),
    ).toBe(false);
    expect(
      provider.verifyWebhookSignature({ headers: {} } as unknown as Request),
    ).toBe(false);
  });

  it("parses BANK_TRANSFER_TRANSACTION webhooks into kobo with originator metadata", () => {
    const provider = new FlutterwaveProvider(mockSdk());
    const parsed = provider.parseWebhookPayload(chargeCompletedWebhook);

    expect(parsed).toEqual({
      accountNumber: null,
      amount: 10_000,
      senderName: "ADEDOTUN OBATOMI",
      senderAccount: "813*******00",
      reference: "seed_john_doe",
      narration: "FOR TESTING PURPOSE",
    });
    expect(provider.getIdempotencyKey(chargeCompletedWebhook)).toBe(
      "100004260420103413157701995493",
    );
    expect(provider.isCreditableWebhook(chargeCompletedWebhook)).toBe(true);
  });

  it("ignores unsuccessful charge webhooks", () => {
    const provider = new FlutterwaveProvider(mockSdk());

    expect(
      provider.isCreditableWebhook({
        ...chargeCompletedWebhook,
        data: { ...chargeCompletedWebhook.data, status: "failed" },
      }),
    ).toBe(false);
  });
});
