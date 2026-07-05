import { describe, expect, it, vi, beforeEach } from "vitest";
import { AppError } from "../AppError";

vi.mock("../../db/pool", () => ({
  pool: { query: vi.fn() },
}));

vi.mock("../../db/businessMembers", () => ({
  getBusinessMembership: vi.fn(),
  canWriteBusiness: (role: string) => role === "owner" || role === "admin",
}));

import { getBusinessMembership } from "../../db/businessMembers";
import {
  assertBusinessMember,
  assertBusinessWriteAccess,
} from "../access";

describe("access helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assertBusinessMember returns role for members", async () => {
    vi.mocked(getBusinessMembership).mockResolvedValue({
      id: "m-1",
      business_id: "biz-1",
      user_id: "user-1",
      role: "viewer",
      joined_at: "",
      created_at: "",
      updated_at: "",
    });

    await expect(assertBusinessMember("user-1", "biz-1")).resolves.toBe("viewer");
  });

  it("assertBusinessMember throws for non-members", async () => {
    vi.mocked(getBusinessMembership).mockResolvedValue(null);

    await expect(assertBusinessMember("user-1", "biz-1")).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    });
  });

  it("assertBusinessWriteAccess rejects viewers", async () => {
    vi.mocked(getBusinessMembership).mockResolvedValue({
      id: "m-1",
      business_id: "biz-1",
      user_id: "user-1",
      role: "viewer",
      joined_at: "",
      created_at: "",
      updated_at: "",
    });

    await expect(assertBusinessWriteAccess("user-1", "biz-1")).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
