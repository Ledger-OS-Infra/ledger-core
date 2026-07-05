import { Router } from "express";
import {
  getBusinessMetrics,
  getCustomerBalance,
  getObligationDetail,
  listAgingSummary,
  listBusinessObligations,
  listBusinessPaymentEvents,
  listCustomerBalances,
  listCustomerLedgerHistory,
  listCustomerOutstandingObligations,
  listMonthlyInflow,
  listObligationAging,
  listObligationPaymentHistory,
  obligationExists,
  listBusinessObligationsForExport,
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
  formatBusinessPaymentEvent,
  formatCustomerBalance,
  formatLedgerHistoryRow,
  formatMonthlyInflow,
  formatObligationAging,
  formatObligationDetail,
  formatPaymentHistoryRow,
} from "../lib/reporting/format";
import { agingListQuery, monthlyInflowQuery, paginationQuery, recentListPaginationQuery } from "../lib/schemas/pagination";
import { businessObligationsListQuery, listObligationsQuery } from "../lib/schemas/obligations";
import {
  requireBusinessMember,
  requireObligationMember,
  requireReportingCustomerMember,
} from "../middleware/businessAccess";
import { validate } from "../middleware/validate";
import { buildObligationsCsv } from "../lib/reporting/csv";

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
  requireBusinessMember("businessId"),
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
  requireBusinessMember("businessId"),
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
  "/business/:businessId/transactions",
  validate({ params: businessIdParams, query: recentListPaginationQuery }),
  requireBusinessMember("businessId"),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const query = res.locals.query as {
        page: number;
        limit: number;
        match_status?: "matched" | "unmatched";
      };
      const result = await listBusinessPaymentEvents(businessId, query, {
        matchStatus: query.match_status,
      });

      res.json(
        paginatedResponse(
          result.items.map(formatBusinessPaymentEvent),
          result.pagination,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/business/:businessId/obligations",
  validate({ params: businessIdParams, query: businessObligationsListQuery }),
  requireBusinessMember("businessId"),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const query = res.locals.query as {
        page: number;
        limit: number;
        status?: string;
        type?: string;
      };

      const result = await listBusinessObligations(businessId, query, {
        status: query.status,
        type: query.type,
      });

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
  "/business/:businessId/aging",
  validate({ params: businessIdParams, query: agingListQuery }),
  requireBusinessMember("businessId"),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const query = res.locals.query as {
        page: number;
        limit: number;
        bucket?: string;
        summary_only?: boolean;
      };

      const summary = await listAgingSummary(businessId);

      if (query.summary_only) {
        res.json({
          data: {
            obligations: paginatedResponse([], {
              page: 1,
              limit: query.limit,
              total: 0,
              total_pages: 0,
            }),
            summary: summary.map(formatAgingSummary),
          },
        });
        return;
      }

      const obligations = await listObligationAging(businessId, query, {
        bucket: query.bucket,
      });

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
  "/business/:businessId/inflow/monthly",
  validate({ params: businessIdParams, query: monthlyInflowQuery }),
  requireBusinessMember("businessId"),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const { months } = res.locals.query as { months: number };
      const rows = await listMonthlyInflow(businessId, months);
      res.json({ data: rows.map(formatMonthlyInflow) });
    } catch (err) {
      next(err);
    }
  },
);

reportingRouter.get(
  "/customers/:customerId",
  validate({ params: reportingCustomerIdParams }),
  requireReportingCustomerMember("customerId"),
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
  requireReportingCustomerMember("customerId"),
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
  requireReportingCustomerMember("customerId"),
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
  requireObligationMember("obligationId"),
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
  requireObligationMember("obligationId"),
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

reportingRouter.get(
  "/business/:businessId/obligations/export",
  validate({ params: businessIdParams, query: listObligationsQuery }),
  requireBusinessMember("businessId"),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const query = res.locals.query as { status?: string; type?: string };

      const rows = await listBusinessObligationsForExport(businessId, {
        status: query.status,
        type: query.type,
      });

      const csv = buildObligationsCsv(rows);
      const filename = `obligations-${businessId}-${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  },
);
