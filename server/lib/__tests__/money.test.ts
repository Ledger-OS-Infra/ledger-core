import { describe, expect, it } from "vitest";
import { koboToNgn, KOBO_PER_NGN, ngnToKobo, assertKoboAmount } from "../money";

describe("money", () => {
  it("converts naira to kobo", () => {
    expect(ngnToKobo(1_500)).toBe(150_000);
    expect(ngnToKobo(150_000)).toBe(15_000_000);
  });

  it("converts kobo to naira", () => {
    expect(koboToNgn(150_000)).toBe(1_500);
    expect(koboToNgn(15_000_000)).toBe(150_000);
  });

  it("uses 100 kobo per naira", () => {
    expect(KOBO_PER_NGN).toBe(100);
  });

  it("rejects negative naira and kobo", () => {
    expect(() => ngnToKobo(-1)).toThrow("NGN amount cannot be negative");
    expect(() => koboToNgn(-100)).toThrow("Kobo amount cannot be negative");
    expect(() => assertKoboAmount(-100)).toThrow("amount must be at least 1");
    expect(() => assertKoboAmount(0)).toThrow("amount must be at least 1");
  });
});
