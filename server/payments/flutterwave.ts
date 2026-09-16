import type { Request } from "express";
import crypto from "crypto";
import { env } from "../config/env";
import type {
  PaymentProvider,
  ProviderVirtualAccount,
  ParsedWebhookPayload,
  CreateVirtualAccountInput,
} from "./provider";

interface FlutterwaveVAResponse {
  status: string;
  data?: {
    account_number?: string;
    bank_name?: string;
    order_ref?: string;
    [key: string]: unknown;
  };
}

interface FlutterwaveWebhookBody {
  event?: string;
  data?: {
    id?: number;
    tx_ref?: string;
    flw_ref?: string;
    amount?: number;
    account_number?: string;
    narration?: string;
    sender_name?: string;
    sender_account_number?: string;
    [key: string]: unknown;
  };
}

export class FlutterwaveProvider implements PaymentProvider {
  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<ProviderVirtualAccount> {
    const { flutterwaveConfig } = env;

    const response = await fetch(
      `${flutterwaveConfig.baseUrl}/v3/virtual-account-numbers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${flutterwaveConfig.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: `${input.accountRef}@ledger-core.app`,
          is_permanent: false,
          tx_ref: input.accountRef,
          narration: input.fullName,
        }),
      },
    );

    const data = (await response.json()) as FlutterwaveVAResponse;

    if (!response.ok || data.status !== "success" || !data.data) {
      throw new Error(
        `Flutterwave VA creation failed: ${JSON.stringify(data)}`,
      );
    }

    return {
      accountNumber: data.data.account_number ?? "",
      bankName: data.data.bank_name ?? "Flutterwave MFB",
      accountRef: input.accountRef,
      providerResponse: data.data as Record<string, unknown>,
    };
  }

  verifyWebhookSignature(req: Request): boolean {
    const signature = req.headers["verif-hash"];
    const { flutterwaveConfig } = env;
    return signature === flutterwaveConfig.secretHash;
  }

  parseWebhookPayload(body: unknown): ParsedWebhookPayload {
    const payload = body as FlutterwaveWebhookBody;
    const data = payload.data ?? {};

    return {
      accountNumber: data.account_number ?? null,
      amount: data.amount ?? 0,
      senderName: data.sender_name ?? null,
      senderAccount: data.sender_account_number ?? null,
      reference: data.tx_ref ?? data.flw_ref ?? null,
      narration: data.narration ?? null,
    };
  }

  getIdempotencyKey(body: unknown): string {
    const payload = body as FlutterwaveWebhookBody;
    const data = payload.data ?? {};
    const key = data.flw_ref ?? data.tx_ref;
    if (!key) {
      throw new Error("Flutterwave webhook missing flw_ref and tx_ref");
    }
    return String(key);
  }
}