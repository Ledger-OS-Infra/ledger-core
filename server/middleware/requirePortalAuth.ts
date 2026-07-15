import type { NextFunction, Request, Response } from "express";
import { verifyPortalToken, type PortalTokenPayload } from "../services/portalAuth";

declare global {
  namespace Express {
    interface Request {
      portalUser?: PortalTokenPayload;
    }
  }
}

export function requirePortalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      error: { message: "Missing authorization header", code: "UNAUTHORIZED" },
    });
    return;
  }

  const token = header.slice(7);

  try {
    req.portalUser = verifyPortalToken(token);
    next();
  } catch {
    res.status(401).json({
      error: {
        message: "Your session has expired. Please look up your account again.",
        code: "INVALID_PORTAL_TOKEN",
      },
    });
  }
}