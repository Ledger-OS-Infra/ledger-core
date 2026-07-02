import { Router } from "express";
import {
  getBusinessMetrics,
  getCustomerBalance,
  getObligationDetail,
  listAgingSummary,
  listCustomerBalances,
  listCustomerLedgerHistory,
  listCustomerOutstandingObligations,
  listObligationAging,
  listObligationPaymentHistory,
  obligationExists,
} from "../db/reporting";
import { AppError } from "../lib/AppError";
import {
  businessIdParams,
  obligationIdParams,
  reportingCustomerIdParams,
} from "../lib/params";
import {
  formatAgingSummary,
  formatBusinessMetrics,
  formatCustomerBalance,
  formatLedgerHistoryRow,
  formatObligationAging,
  formatObligationDetail,
  formatPaymentHistoryRow,
} from "../lib/reporting/format";
import { agingListQuery, paginationQuery } from "../lib/schemas/pagination";
import { validate } from "../middleware/validate";

export const reportingRouter = Router();

function paginatedResponse<T>(items: T[], pagination: {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}) {
  return { data: items, pagination };
}

reportingRouter.get(
  "/business/:businessId/metrics",
  validate({ params: businessIdParams }),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const metrics = await getBusinessMetrics(businessId);

      if (!metrics) {
        throw new AppError("Business not found", 404, "BUSINESS_NOT_FOUND");
      }

      res.json({ data: formatBusinessMetrics(metrics) });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/business/:businessId/customers",
  validate({ params: businessIdParams, query: paginationQuery }),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const query = res.locals.query as { page: number; limit: number };
      const result = await listCustomerBalances(businessId, query);

      res.json(
        paginatedResponse(
          result.items.map(formatCustomerBalance),
          result.pagination,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/business/:businessId/aging",
  validate({ params: businessIdParams, query: agingListQuery }),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const query = res.locals.query as {
        page: number;
        limit: number;
        bucket?: string;
      };

      const [obligations, summary] = await Promise.all([
        listObligationAging(businessId, query, { bucket: query.bucket }),
        listAgingSummary(businessId),
      ]);

      res.json({
        data: {
          obligations: paginatedResponse(
            obligations.items.map(formatObligationAging),
            obligations.pagination,
          ),
          summary: summary.map(formatAgingSummary),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/customers/:customerId",
  validate({ params: reportingCustomerIdParams }),
  async (_req, res, next) => {
    try {
      const { customerId } = res.locals.params as { customerId: string };
      const balance = await getCustomerBalance(customerId);

      if (!balance) {
        throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      res.json({ data: formatCustomerBalance(balance) });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/customers/:customerId/obligations",
  validate({ params: reportingCustomerIdParams, query: paginationQuery }),
  async (_req, res, next) => {
    try {
      const { customerId } = res.locals.params as { customerId: string };
      const query = res.locals.query as { page: number; limit: number };

      const customer = await getCustomerBalance(customerId);
      if (!customer) {
        throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      const result = await listCustomerOutstandingObligations(customerId, query);
      res.json(
        paginatedResponse(
          result.items.map(formatObligationAging),
          result.pagination,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/customers/:customerId/ledger",
  validate({ params: reportingCustomerIdParams, query: paginationQuery }),
  async (_req, res, next) => {
    try {
      const { customerId } = res.locals.params as { customerId: string };
      const query = res.locals.query as { page: number; limit: number };

      const customer = await getCustomerBalance(customerId);
      if (!customer) {
        throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      const result = await listCustomerLedgerHistory(customerId, query);
      res.json(
        paginatedResponse(
          result.items.map(formatLedgerHistoryRow),
          result.pagination,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/obligations/:obligationId",
  validate({ params: obligationIdParams }),
  async (_req, res, next) => {
    try {
      const { obligationId } = res.locals.params as { obligationId: string };
      const detail = await getObligationDetail(obligationId);

      if (!detail) {
        throw new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND");
      }

      res.json({ data: formatObligationDetail(detail) });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/obligations/:obligationId/payments",
  validate({ params: obligationIdParams, query: paginationQuery }),
  async (_req, res, next) => {
    try {
      const { obligationId } = res.locals.params as { obligationId: string };
      const query = res.locals.query as { page: number; limit: number };

      if (!(await obligationExists(obligationId))) {
        throw new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND");
      }

      const result = await listObligationPaymentHistory(obligationId, query);
      res.json(
        paginatedResponse(
          result.items.map(formatPaymentHistoryRow),
          result.pagination,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);
