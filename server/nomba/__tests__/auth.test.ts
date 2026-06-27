import { describe, expect, it, vi, beforeEach } from "vitest";
import { NombaAuthService } from "../auth";
import type { NombaClientConfig } from "../types";

const config: NombaClientConfig = {
  baseUrl: "https://sandbox.nomba.com",
  parentAccountId: "parent-id",
  subAccountId: "sub-id",
  clientId: "client-id",
  clientSecret: "client-secret",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("NombaAuthService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("issues and caches access token", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        code: "00",
        description: "Success",
        data: {
          businessId: "biz",
          access_token: "token-1",
          refresh_token: "refresh-1",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      }),
    );

    const auth = new NombaAuthService(config, fetchFn);

    await expect(auth.getAccessToken()).resolves.toBe("token-1");
    await expect(auth.getAccessToken()).resolves.toBe("token-1");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("refreshes token when near expiry", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: {
            businessId: "biz",
            access_token: "token-1",
            refresh_token: "refresh-1",
            expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString(),
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          code: "00",
          description: "Success",
          data: {
            businessId: "biz",
            access_token: "token-2",
            refresh_token: "refresh-2",
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        }),
      );

    const auth = new NombaAuthService(config, fetchFn);

    await expect(auth.getAccessToken()).resolves.toBe("token-1");
    await expect(auth.getAccessToken()).resolves.toBe("token-2");
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(fetchFn.mock.calls[1]?.[0]).toContain("/v1/auth/token/refresh");
  });
});
