import type { NextFunction, Request, Response } from "express";
import type { BusinessMemberRole } from "../db/businessMembers";
import {
  assertBusinessMember,
  assertBusinessWriteAccess,
  assertCustomerAccess,
  assertObligationAccess,
} from "../lib/access";
import { AppError } from "../lib/AppError";

declare global {
  namespace Express {
    interface Locals {
      membershipRole?: BusinessMemberRole;
    }
  }
}

function requireUserId(req: Request): string {
  if (!req.user?.sub) {
    throw new AppError("Missing authorization header", 401, "UNAUTHORIZED");
  }
  return req.user.sub;
}

function requireRouteParam(
  req: Request,
  paramName: string,
  notFoundError: AppError,
): string {
  const value = req.params[paramName];
  if (typeof value !== "string" || value.length === 0) {
    throw notFoundError;
  }
  return value;
}

export function requireBusinessMember(paramName = "businessId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = requireRouteParam(
        req,
        paramName,
        new AppError("Business not found", 404, "BUSINESS_NOT_FOUND"),
      );

      res.locals.membershipRole = await assertBusinessMember(
        requireUserId(req),
        businessId,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireBusinessWrite(paramName = "businessId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = requireRouteParam(
        req,
        paramName,
        new AppError("Business not found", 404, "BUSINESS_NOT_FOUND"),
      );

      res.locals.membershipRole = await assertBusinessWriteAccess(
        requireUserId(req),
        businessId,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireBusinessWriteFromBody(fieldName = "business_id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = (req.body as Record<string, unknown>)?.[fieldName];

      if (typeof businessId !== "string" || businessId.length === 0) {
        throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
      }

      res.locals.membershipRole = await assertBusinessWriteAccess(
        requireUserId(req),
        businessId,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireBusinessMemberFromQuery(queryName = "business_id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessId = (res.locals.query as Record<string, unknown> | undefined)?.[
        queryName
      ];

      if (typeof businessId !== "string" || businessId.length === 0) {
        throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
      }

      res.locals.membershipRole = await assertBusinessMember(
        requireUserId(req),
        businessId,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireCustomerMember(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = requireRouteParam(
        req,
        paramName,
        new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND"),
      );

      res.locals.membershipRole = await assertCustomerAccess(
        requireUserId(req),
        customerId,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireCustomerWrite(paramName = "id") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = requireRouteParam(
        req,
        paramName,
        new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND"),
      );

      res.locals.membershipRole = await assertCustomerAccess(
        requireUserId(req),
        customerId,
        true,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireReportingCustomerMember(paramName = "customerId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customerId = requireRouteParam(
        req,
        paramName,
        new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND"),
      );

      res.locals.membershipRole = await assertCustomerAccess(
        requireUserId(req),
        customerId,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireObligationMember(paramName = "obligationId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const obligationId = requireRouteParam(
        req,
        paramName,
        new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND"),
      );

      res.locals.membershipRole = await assertObligationAccess(
        requireUserId(req),
        obligationId,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireObligationWrite(paramName = "obligationId") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const obligationId = requireRouteParam(
        req,
        paramName,
        new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND"),
      );

      res.locals.membershipRole = await assertObligationAccess(
        requireUserId(req),
        obligationId,
        true,
      );
      next();
    } catch (err) {
      next(err);
    }
  };
}
