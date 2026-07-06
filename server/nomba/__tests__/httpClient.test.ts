import { describe, expect, it, vi } from "vitest";
import { NombaAuthService } from "../auth";
import { NombaHttpClient } from "../httpClient";
import {
  NombaNotFoundError,
  NombaRateLimitError,
  NombaValidationError,
} from "../errors";
import type { NombaClientConfig } from "../types";

const config: NombaClientConfig = {
  baseUrl: "https://sandbox.nomba.com",
  parentAccountId: "parent-id",
  subAccountId: "sub-id",
  clientId: "client-id",
  clientSecret: "client-secret",
};

const virtualAccount = {
  createdAt: "2024-10-11T14:15:39.376Z",
  accountHolderId: "holder-id",
  accountRef: "ref-123",
  accountName: "John Doe",
  currency: "NGN" as const,
  bankAccountNumber: "91714245345",
  bankName: "Amucha MFB",
  bankAccountName: "John Doe/Ledger",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createClient(fetchFn: typeof fetch) {
  const auth = new NombaAuthService(config, fetchFn);
  return new NombaHttpClient(config, auth, fetchFn);
}

describe("NombaHttpClient", () => {
  it("creates virtual account on sub-account endpoint", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: {
            businessId: "biz",
            access_token: "token",
            refresh_token: "refresh",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: virtualAccount,
        }),
      );

    const client = createClient(fetchFn);
    const result = await client.post<typeof virtualAccount>(
      "/v1/accounts/virtual",
      {
        accountRef: "ref-123",
        accountName: "John Doe",
        currency: "NGN",
      },
    );

    expect(result.bankAccountNumber).toBe("91714245345");
    expect(fetchFn.mock.calls[1]?.[0]).toBe(
      "https://sandbox.nomba.com/v1/accounts/virtual",
    );
  });

  it("maps validation errors", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: {
            businessId: "biz",
            access_token: "token",
            refresh_token: "refresh",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { code: "01", description: "Invalid accountRef" },
          400,
        ),
      );

    const client = createClient(fetchFn);

    await expect(
      client.post("/v1/accounts/virtual", {}),
    ).rejects.toBeInstanceOf(NombaValidationError);
  });

  it("retries rate-limited requests", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: {
            businessId: "biz",
            access_token: "token",
            refresh_token: "refresh",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ code: "429", description: "Too many requests" }, 429),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: virtualAccount,
        }),
      );

    const client = createClient(fetchFn);
    const result = await client.get<typeof virtualAccount>(
      "/v1/accounts/virtual/ref-123",
    );

    expect(result.accountRef).toBe("ref-123");
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("maps not found errors without retry", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: {
            businessId: "biz",
            access_token: "token",
            refresh_token: "refresh",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ code: "01", description: "Not found" }, 404),
      );

    const client = createClient(fetchFn);

    await expect(
      client.get("/v1/accounts/virtual/missing"),
    ).rejects.toBeInstanceOf(NombaNotFoundError);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

describe("NombaRateLimitError", () => {
  it("is retryable", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: {
            businessId: "biz",
            access_token: "token",
            refresh_token: "refresh",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ code: "429", description: "Rate limit" }, 429),
      )
      .mockResolvedValueOnce(
        jsonResponse({ code: "429", description: "Rate limit" }, 429),
      )
      .mockResolvedValueOnce(
        jsonResponse({ code: "429", description: "Rate limit" }, 429),
      );

    const client = createClient(fetchFn);

    await expect(client.get("/v1/accounts/virtual/ref-123")).rejects.toBeInstanceOf(
      NombaRateLimitError,
    );
  });
});
