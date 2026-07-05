import { describe, expect, it } from "vitest";
import {
  advanceMonthlyRunDate,
  billingPeriodFromDate,
  billingReferenceCode,
  isOnOrBefore,
} from "../recurrence";

describe("billingReferenceCode", () => {
  it("formats DSTV-style MBU reference for a due date", () => {
    expect(billingReferenceCode("2026-06-01")).toBe("MBU-2026-06");
    expect(billingReferenceCode("2026-07-01")).toBe("MBU-2026-07");
  });
});

describe("billingPeriodFromDate", () => {
  it("extracts YYYY-MM from ISO date", () => {
    expect(billingPeriodFromDate("2026-06-01")).toBe("2026-06");
  });
});

describe("advanceMonthlyRunDate", () => {
  it("advances to the next month on the configured day", () => {
    expect(advanceMonthlyRunDate("2026-06-01", 1)).toBe("2026-07-01");
    expect(advanceMonthlyRunDate("2026-07-01", 1)).toBe("2026-08-01");
  });

  it("rolls year when advancing from December", () => {
    expect(advanceMonthlyRunDate("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("clamps day_of_month to 28", () => {
    expect(advanceMonthlyRunDate("2026-01-15", 31)).toBe("2026-02-28");
  });
});

describe("isOnOrBefore", () => {
  it("compares ISO dates lexicographically", () => {
    expect(isOnOrBefore("2026-07-01", "2026-06-01")).toBe(true);
    expect(isOnOrBefore("2026-06-01", "2026-06-01")).toBe(true);
    expect(isOnOrBefore("2026-05-31", "2026-06-01")).toBe(false);
  });
});

describe("DSTV Jun/Jul obligation periods", () => {
  it("produces sequential monthly references through July", () => {
    let runDate = "2026-06-01";
    const references: string[] = [];

    for (let i = 0; i < 2; i++) {
      references.push(billingReferenceCode(runDate));
      runDate = advanceMonthlyRunDate(runDate, 1);
    }

    expect(references).toEqual(["MBU-2026-06", "MBU-2026-07"]);
    expect(runDate).toBe("2026-08-01");
  });
});
