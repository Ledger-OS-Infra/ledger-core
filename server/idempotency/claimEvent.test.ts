import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../redis/client", () => ({
  redis: { set: vi.fn() },
}));

import { redis } from "../redis/client";
import { claimEvent } from "./claimEvent";

describe("claimEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on first claim", async () => {
    (redis.set as any).mockResolvedValue("OK");
    const result = await claimEvent("evt_123");
    expect(result).toBe(true);
  });

  it("returns false when the event was already claimed", async () => {
    (redis.set as any).mockResolvedValue(null);
    const result = await claimEvent("evt_123");
    expect(result).toBe(false);
  });

  it("calls redis.set with NX and an expiry", async () => {
    (redis.set as any).mockResolvedValue("OK");
    await claimEvent("evt_123");
    expect(redis.set).toHaveBeenCalledWith(
      "idempotency:payment-event:evt_123",
      "1",
      "EX",
      60 * 60 * 24 * 3,
      "NX"
    );
  });
});