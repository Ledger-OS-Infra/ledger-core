import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface PortalTokenPayload {
  sub: string; // customer id
  aud: "customer-portal";
}

export function signPortalToken(customerId: string): string {
  const payload: Pick<PortalTokenPayload, "sub"> = { sub: customerId };

  return jwt.sign(payload, env.portalJwtSecret, {
    audience: "customer-portal",
    expiresIn: env.portalTokenExpiresIn as string & jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

export function verifyPortalToken(token: string): PortalTokenPayload {
  const decoded = jwt.verify(token, env.portalJwtSecret, {
    audience: "customer-portal",
    algorithms: ["HS256"],
  });

  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("Malformed portal token");
  }

  return { sub: decoded.sub, aud: "customer-portal" };
}