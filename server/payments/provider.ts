import type { Request } from "express";

/**
 * Provider-agnostic shape returned after creating a virtual account.
 * Both Nomba and Flutterwave map their responses to this.
 */
export interface ProviderVirtualAccount {
  accountNumber: string;
  bankName: string;
  accountRef: string;
  providerResponse: Record<string, unknown>;
}

/**
 * Provider-agnostic shape extracted from any inbound webhook payload.
 * Both Nomba and Flutterwave map their payloads to this before the
 * reconciliation pipeline sees them.
 */
export interface ParsedWebhookPayload {
  accountNumber: string | null;
  amount: number;
  senderName: string | null;
  senderAccount: string | null;
  reference: string | null;
  narration: string | null;
}

export interface CreateVirtualAccountInput {
  customerId: string;
  fullName: string;
  accountRef: string;
  email: string;
  phone?: string | null;
  /** Optional NGN major-unit amount. Flutterwave dynamic VAs can pin a single payment. */
  amount?: number;
}

/**
 * The PaymentProvider interface — both Nomba and Flutterwave implement this.
 * Everything downstream (matching, allocation, ledger) talks only to this
 * interface, never to a provider directly.
 */
export interface PaymentProvider {
  /**
   * Create a virtual bank account for a customer.
   * Returns a provider-agnostic account shape.
   */
  createVirtualAccount(
    input: CreateVirtualAccountInput,
  ): Promise<ProviderVirtualAccount>;

  /**
   * Verify the webhook signature from the provider.
   * Returns true if valid, false if tampered or missing.
   */
  verifyWebhookSignature(req: Request): boolean;

  /**
   * Whether this webhook is a successful credit that should be persisted.
   */
  isCreditableWebhook(body: unknown): boolean;

  /**
   * Parse the raw webhook body into the standard internal shape.
   * Called after signature verification passes.
   * `amount` is in kobo.
   */
  parseWebhookPayload(body: unknown): ParsedWebhookPayload;

  /**
   * Extract the idempotency key from the webhook body.
   * Used by claimEvent to deduplicate retries.
   */
  getIdempotencyKey(body: unknown): string;
}