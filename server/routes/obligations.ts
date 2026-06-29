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
import { validate } from "../middleware/validate";

export const obligationsRouter = Router();

obligationsRouter.post(
  "/customers/:id/obligations",
  validate({ params: customerIdParams, body: createObligationBody }),
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
  validate({
    params: customerIdParams,
    query: listObligationsQuery,
  }),
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
  validate({ params: obligationIdParams }),
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
  validate({ params: obligationIdParams, body: patchObligationBody }),
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
