import { Router } from "express";
import {
  createObligation,
  getObligationById,
  listObligationsByCustomer,
  updateObligation,
} from "../db/obligations";
import { AppError } from "../lib/AppError";
import { customerIdParams, obligationIdParams } from "../lib/params";
import {
  createObligationBody,
  listObligationsQuery,
  patchObligationBody,
} from "../lib/schemas/obligations";
import {
  requireCustomerMember,
  requireCustomerWrite,
  requireObligationMember,
  requireObligationWrite,
} from "../middleware/businessAccess";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";

export const obligationsRouter = Router();

obligationsRouter.post(
  "/customers/:id/obligations",
  requireAuth,
  validate({ params: customerIdParams, body: createObligationBody }),
  requireCustomerWrite("id"),
  async (req, res, next) => {
    try {
      const { id: customerId } = res.locals.params as { id: string };
      const body = req.body as {
        type: "INVOICE" | "SUBSCRIPTION" | "FEE" | "LEVY" | "CUSTOM";
        amount: number;
        due_date: string;
        reference_code?: string;
        metadata?: Record<string, unknown>;
      };

      const obligation = await createObligation({
        customerId,
        type: body.type,
        amount: body.amount,
        dueDate: body.due_date,
        referenceCode: body.reference_code,
        metadata: body.metadata,
      });

      res.status(201).json({ data: obligation });
    } catch (err) {
      next(err);
    }
  },
);

obligationsRouter.get(
  "/customers/:id/obligations",
  requireAuth,
  validate({
    params: customerIdParams,
    query: listObligationsQuery,
  }),
  requireCustomerMember("id"),
  async (_req, res, next) => {
    try {
      const { id: customerId } = res.locals.params as { id: string };
      const query = res.locals.query as {
        status?: "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
        type?: "INVOICE" | "SUBSCRIPTION" | "FEE" | "LEVY" | "CUSTOM";
      };

      const obligations = await listObligationsByCustomer(customerId, {
        status: query.status,
        type: query.type,
      });

      res.json({ data: obligations });
    } catch (err) {
      next(err);
    }
  },
);

obligationsRouter.get(
  "/obligations/:obligationId",
  requireAuth,
  validate({ params: obligationIdParams }),
  requireObligationMember("obligationId"),
  async (_req, res, next) => {
    try {
      const { obligationId } = res.locals.params as { obligationId: string };
      const obligation = await getObligationById(obligationId);

      if (!obligation) {
        throw new AppError("Obligation not found", 404, "OBLIGATION_NOT_FOUND");
      }

      res.json({ data: obligation });
    } catch (err) {
      next(err);
    }
  },
);

obligationsRouter.patch(
  "/obligations/:obligationId",
  requireAuth,
  validate({ params: obligationIdParams, body: patchObligationBody }),
  requireObligationWrite("obligationId"),
  async (req, res, next) => {
    try {
      const { obligationId } = res.locals.params as { obligationId: string };
      const body = req.body as {
        type?: "INVOICE" | "SUBSCRIPTION" | "FEE" | "LEVY" | "CUSTOM";
        amount?: number;
        due_date?: string;
        reference_code?: string | null;
        metadata?: Record<string, unknown>;
      };

      const obligation = await updateObligation(obligationId, {
        type: body.type,
        amount: body.amount,
        dueDate: body.due_date,
        referenceCode: body.reference_code,
        metadata: body.metadata,
      });

      res.json({ data: obligation });
    } catch (err) {
      next(err);
    }
  },
);
