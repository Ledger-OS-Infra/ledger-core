import { Router } from "express";
import { AppError } from "../lib/AppError";
import { businessIdParams, obligationIdParams } from "../lib/params";
import {
  getBusinessMetrics,
  listAgingSummary,
  listCustomerBalances,
  listObligationAging,
  listObligationPaymentHistory,
} from "../db/reporting";
import { validate } from "../middleware/validate";

export const reportingRouter = Router();

reportingRouter.get(
  "/business/:businessId/metrics",
  validate({ params: businessIdParams }),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as {
        businessId: string;
      };
      const metrics = await getBusinessMetrics(businessId);

      if (!metrics) {
        throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
      }

      res.json({ data: metrics });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/business/:businessId/customers",
  validate({ params: businessIdParams }),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as {
        businessId: string;
      };
      const customers = await listCustomerBalances(businessId);
      res.json({ data: customers });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/business/:businessId/aging",
  validate({ params: businessIdParams }),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as {
        businessId: string;
      };
      const [obligations, summary] = await Promise.all([
        listObligationAging(businessId),
        listAgingSummary(businessId),
      ]);

      res.json({
        data: {
          obligations,
          summary,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/obligations/:obligationId/payments",
  validate({ params: obligationIdParams }),
  async (_req, res, next) => {
    try {
      const { obligationId } = res.locals.params as {
        obligationId: string;
      };
      const history = await listObligationPaymentHistory(obligationId);

      if (history.length === 0) {
        throw new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND");
      }

      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  },
);
