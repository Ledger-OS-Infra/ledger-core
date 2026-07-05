import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../lib/AppError";

vi.mock("../../lib/access", () => ({
  assertBusinessMember: vi.fn(),
  assertBusinessWriteAccess: vi.fn(),
  assertCustomerAccess: vi.fn(),
  assertObligationAccess: vi.fn(),
}));

import {
  assertBusinessMember,
  assertBusinessWriteAccess,
  assertCustomerAccess,
} from "../../lib/access";
import {
  requireBusinessMember,
  requireBusinessWriteFromBody,
  requireCustomerWrite,
} from "../businessAccess";

function makeMockReqRes(params: Record<string, string> = {}, body: Record<string, unknown> = {}) {
  const req = {
    user: { sub: "user-1", email: "test@example.com" },
    params,
    body,
  } as unknown as Request;

  const res = {
    locals: {},
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("businessAccess middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requireBusinessMember passes when user is a member", async () => {
    vi.mocked(assertBusinessMember).mockResolvedValue("admin");
    const { req, res, next } = makeMockReqRes({ businessId: "biz-1" });

    await requireBusinessMember("businessId")(req, res, next);

    expect(assertBusinessMember).toHaveBeenCalledWith("user-1", "biz-1");
    expect(res.locals.membershipRole).toBe("admin");
    expect(next).toHaveBeenCalledWith();
  });

  it("requireBusinessMember forwards forbidden errors", async () => {
    vi.mocked(assertBusinessMember).mockRejectedValue(
      new AppError("Forbidden", 403, "FORBIDDEN"),
    );
    const { req, res, next } = makeMockReqRes({ businessId: "biz-1" });

    await requireBusinessMember("businessId")(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("requireBusinessWriteFromBody checks write access on body business_id", async () => {
    vi.mocked(assertBusinessWriteAccess).mockResolvedValue("owner");
    const { req, res, next } = makeMockReqRes({}, { business_id: "biz-1" });

    await requireBusinessWriteFromBody("business_id")(req, res, next);

    expect(assertBusinessWriteAccess).toHaveBeenCalledWith("user-1", "biz-1");
    expect(next).toHaveBeenCalledWith();
  });

  it("requireCustomerWrite checks customer write access", async () => {
    vi.mocked(assertCustomerAccess).mockResolvedValue("admin");
    const { req, res, next } = makeMockReqRes({ id: "cus-1" });

    await requireCustomerWrite("id")(req, res, next);

    expect(assertCustomerAccess).toHaveBeenCalledWith("user-1", "cus-1", true);
    expect(next).toHaveBeenCalledWith();
  });
});
