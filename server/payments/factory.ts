import { env } from "../config/env";
import { FlutterwaveProvider } from "./flutterwave";
import type { PaymentProvider } from "./provider";

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    provider = new FlutterwaveProvider();
  }
  return provider;
}

export function resetPaymentProvider(): void {
  provider = null;
}