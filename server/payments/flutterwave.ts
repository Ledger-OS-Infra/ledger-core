import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import Flutterwave from "flutterwave-node-v3";
import { env } from "../config/env";
import { ngnMajorToKobo } from "../lib/money";
import type {
  PaymentProvider,
  ProviderVirtualAccount,
  ParsedWebhookPayload,
  CreateVirtualAccountInput,
} from "./provider";

export interface FlutterwaveSdk {
  VirtualAcct: {
    create(payload: {
      email: string;
      tx_ref: string;
      is_permanent: boolean;
      phonenumber?: string;
      firstname?: string;
      lastname?: string;
      narration?: string;
      currency?: string;
      amount?: number;
    }): Promise<FlutterwaveVAResponse>;
  };
}

interface FlutterwaveVAResponse {
  status: string;
  message?: string;
  data?: {
    account_number?: string;
    bank_name?: string;
    order_ref?: string;
    flw_ref?: string;
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
    status?: string;
    account_number?: string;
    narration?: string;
    [key: string]: unknown;
  };
  meta_data?: {
    originatorname?: string;
    originatoraccountnumber?: string;
    bankname?: string;
    [key: string]: unknown;
  };
  "event.type"?: string;
}

/** flutterwave-node-v3 appends `v3/...` paths to this host. */
export function flutterwaveSdkBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "").replace(/\/v3$/i, "");
  return `${trimmed}/`;
}

export function createFlutterwaveSdk(
  config = env.flutterwaveConfig,
): FlutterwaveSdk {
  return new Flutterwave(
    config.publicKey,
    config.secretKey,
    flutterwaveSdkBaseUrl(config.baseUrl),
  );
}

function splitName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstname = parts[0] || "Customer";
  const lastname = parts.slice(1).join(" ") || firstname;
  return { firstname, lastname };
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function headerValue(
  header: string | string[] | undefined,
): string | undefined {
  return Array.isArray(header) ? header[0] : header;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export class FlutterwaveProvider implements PaymentProvider {
  private sdk: FlutterwaveSdk | undefined;

  constructor(sdk?: FlutterwaveSdk) {
    this.sdk = sdk;
  }

  private getSdk(): FlutterwaveSdk {
    if (!this.sdk) {
      this.sdk = createFlutterwaveSdk();
    }
    return this.sdk;
  }

  async createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<ProviderVirtualAccount> {
    const { firstname, lastname } = splitName(input.fullName);
    const phonenumber = input.phone ? digitsOnly(input.phone) : undefined;

    const isSandbox = env.flutterwaveConfig.environment === "sandbox";
    const amount =
      input.amount && input.amount > 0
        ? input.amount
        : isSandbox
          ? 1
          : undefined;

    const data = await this.getSdk().VirtualAcct.create({
      email: input.email,
      tx_ref: input.accountRef,
      is_permanent: false,
      narration: input.fullName,
      ...(amount !== undefined ? { amount } : {}),
    });

    if (data.status !== "success" || !data.data?.account_number) {
      throw new Error(
        `Flutterwave VA creation failed: ${JSON.stringify(data)}`,
      );
    }

    return {
      accountNumber: data.data.account_number,
      bankName: data.data.bank_name ?? "Flutterwave MFB",
      accountRef: input.accountRef,
      providerResponse: data.data as Record<string, unknown>,
    };
  }

  verifyWebhookSignature(req: Request): boolean {
    const signature = headerValue(req.headers["verif-hash"]);
    if (!signature) {
      return false;
    }

    const expected = env.flutterwaveConfig.secretHash;
    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    if (receivedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(receivedBuffer, expectedBuffer);
  }

  isCreditableWebhook(body: unknown): boolean {
    const payload = body as FlutterwaveWebhookBody;
    if (payload.event && payload.event !== "charge.completed") {
      return false;
    }

    const status = payload.data?.status;
    if (status && status.toLowerCase() !== "successful") {
      return false;
    }

    return true;
  }

  parseWebhookPayload(body: unknown): ParsedWebhookPayload {
    const payload = body as FlutterwaveWebhookBody;
    const data = payload.data ?? {};
    const meta = payload.meta_data ?? {};
    const amountNgn = data.amount;

    return {
      accountNumber: optionalString(data.account_number),
      amount:
        typeof amountNgn === "number" && amountNgn > 0
          ? ngnMajorToKobo(amountNgn)
          : 0,
      senderName: optionalString(meta.originatorname),
      senderAccount: optionalString(meta.originatoraccountnumber),
      reference: optionalString(data.tx_ref) ?? optionalString(data.flw_ref),
      narration: optionalString(data.narration),
    };
  }

  getIdempotencyKey(body: unknown): string {
    const payload = body as FlutterwaveWebhookBody;
    const data = payload.data ?? {};
    const key = data.flw_ref ?? data.tx_ref ?? data.id;
    if (!key) {
      throw new Error("Flutterwave webhook missing flw_ref and tx_ref");
    }
    return String(key);
  }
}
