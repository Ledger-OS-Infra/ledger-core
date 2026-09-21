import { afterEach, describe, expect, it, vi } from "vitest";
import {
  databaseConnectionConfig,
  isCompletePem,
  isNeonHost,
} from "../connection";

const neonPooled =
  "postgresql://user:pass@ep-abc-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const neonDirect =
  "postgresql://user:pass@ep-abc.us-east-1.aws.neon.tech/neondb?sslmode=require";
const aiven =
  "postgresql://avnadmin:pass@svc.a.aivencloud.com:12345/defaultdb?sslmode=require";
const local = "postgresql://user:password@localhost:5432/ledger_core";

describe("databaseConnectionConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("leaves local Docker URLs without SSL", () => {
    vi.stubEnv("DATABASE_URL", local);

    expect(databaseConnectionConfig()).toEqual({ connectionString: local });
  });

  it("enables verified TLS for Neon and strips sslmode", () => {
    vi.stubEnv("DATABASE_URL", neonPooled);

    const config = databaseConnectionConfig();

    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.connectionString).not.toMatch(/sslmode=/i);
    expect(config.connectionString).toContain("neon.tech");
  });

  it("does not apply an Aiven CA to Neon hosts", () => {
    vi.stubEnv("DATABASE_URL", neonPooled);
    vi.stubEnv("DATABASE_CA_CERT_PATH", "./certs/aiven-ca.pem");

    const config = databaseConnectionConfig();

    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.ssl).not.toHaveProperty("ca");
  });

  it("strips channel_binding from Neon URLs", () => {
    const withBinding = `${neonPooled}&channel_binding=require`;
    vi.stubEnv("DATABASE_URL", withBinding);

    const config = databaseConnectionConfig();

    expect(config.connectionString).not.toMatch(/channel_binding=/i);
  });

  it("enables verified TLS for a Neon host even without sslmode", () => {
    const withoutSsl =
      "postgresql://user:pass@ep-abc.us-east-1.aws.neon.tech/neondb";
    vi.stubEnv("DATABASE_URL", withoutSsl);

    expect(databaseConnectionConfig().ssl).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("uses an explicit connection string (direct URL for migrations)", () => {
    vi.stubEnv("DATABASE_URL", neonPooled);

    const config = databaseConnectionConfig(neonDirect);

    expect(isNeonHost(config.connectionString)).toBe(true);
    expect(config.connectionString).toContain("ep-abc.us-east-1.aws.neon.tech");
    expect(config.connectionString).not.toContain("-pooler");
  });

  it("encrypts Aiven without CA verification unless a CA is provided", () => {
    vi.stubEnv("DATABASE_URL", aiven);

    expect(databaseConnectionConfig().ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it("throws when DATABASE_URL is missing", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(() => databaseConnectionConfig()).toThrow(/DATABASE_URL is required/);
  });
});

describe("isNeonHost", () => {
  it("detects neon.tech pooled and direct hosts", () => {
    expect(isNeonHost(neonPooled)).toBe(true);
    expect(isNeonHost(neonDirect)).toBe(true);
    expect(isNeonHost(local)).toBe(false);
    expect(isNeonHost(aiven)).toBe(false);
  });
});

describe("isCompletePem", () => {
  it("requires both PEM markers", () => {
    expect(isCompletePem("-----BEGIN CERTIFICATE-----")).toBe(false);
    expect(
      isCompletePem(
        "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----",
      ),
    ).toBe(true);
  });
});
