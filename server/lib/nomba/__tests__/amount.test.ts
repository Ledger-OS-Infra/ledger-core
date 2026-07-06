import { describe, expect, it } from "vitest";
import { nombaNgnStringToKobo } from "../amount";

describe("nombaNgnStringToKobo", () => {
  it("converts decimal NGN strings to kobo", () => {
    expect(nombaNgnStringToKobo("281946.0")).toBe(28_194_600);
    expect(nombaNgnStringToKobo("1500.50")).toBe(150_050);
  });

  it("rejects invalid amounts", () => {
    expect(() => nombaNgnStringToKobo("not-a-number")).toThrow();
    expect(() => nombaNgnStringToKobo("-1")).toThrow();
  });
});
