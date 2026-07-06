import { afterEach, describe, expect, it, vi } from "vitest";

describe("nombaEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses live config when NOMBA_ENV=production", async () => {
    vi.stubEnv("NOMBA_ENV", "production");
    vi.stubEnv("NOMBA_API_BASE_URL", "https://api.nomba.com");
    vi.stubEnv("NOMBA_PARENT_ACCOUNT_ID", "live-parent");
    vi.stubEnv("NOMBA_SUB_ACCOUNT_ID", "live-sub");
    vi.stubEnv("NOMBA_CLIENT_ID", "live-client");
    vi.stubEnv("NOMBA_CLIENT_SECRET", "live-secret");

    const { nombaConfig, nombaEnvironment } = await import("../nombaEnv");

    expect(nombaEnvironment).toBe("production");
    expect(nombaConfig.baseUrl).toBe("https://api.nomba.com");
    expect(nombaConfig.clientId).toBe("live-client");
  });

  it("falls back to live parent/sub for sandbox when sandbox IDs are omitted", async () => {
    vi.stubEnv("NOMBA_ENV", "sandbox");
    vi.stubEnv("NOMBA_API_BASE_URL", "https://api.nomba.com");
    vi.stubEnv("NOMBA_PARENT_ACCOUNT_ID", "shared-parent");
    vi.stubEnv("NOMBA_SUB_ACCOUNT_ID", "shared-sub");
    vi.stubEnv("NOMBA_CLIENT_ID", "live-client");
    vi.stubEnv("NOMBA_CLIENT_SECRET", "live-secret");
    vi.stubEnv("NOMBA_SANDBOX_API_BASE_URL", "https://sandbox.nomba.com");
    vi.stubEnv("NOMBA_SANDBOX_CLIENT_ID", "sandbox-client");
    vi.stubEnv("NOMBA_SANDBOX_CLIENT_SECRET", "sandbox-secret");

    const { nombaConfig, nombaEnvironment } = await import("../nombaEnv");

    expect(nombaEnvironment).toBe("sandbox");
    expect(nombaConfig.baseUrl).toBe("https://sandbox.nomba.com");
    expect(nombaConfig.clientId).toBe("sandbox-client");
    expect(nombaConfig.parentAccountId).toBe("shared-parent");
    expect(nombaConfig.subAccountId).toBe("shared-sub");
  });
});
