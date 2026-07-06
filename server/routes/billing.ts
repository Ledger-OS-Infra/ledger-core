import { Router } from "express";
import {
  createBillingRule,
  listBillingRulesByBusiness,
  listBillingRulesByCustomer,
} from "../db/billingRules";
import { businessIdParams, customerIdParams } from "../lib/params";
import { createBillingRuleBody } from "../lib/schemas/billing";
import {
  requireBusinessMember,
  requireCustomerMember,
  requireCustomerWrite,
} from "../middleware/businessAccess";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";

export const billingRouter = Router();

billingRouter.get(
  "/business/:businessId/billing-rules",
  requireAuth,
  validate({ params: businessIdParams }),
  requireBusinessMember("businessId"),
  async (_req, res, next) => {
    try {
      const { businessId } = res.locals.params as { businessId: string };
      const rules = await listBillingRulesByBusiness(businessId);
      res.json({ data: rules });
    } catch (err) {
      next(err);
    }
  },
);

billingRouter.post(
  "/customers/:id/billing-rules",
  requireAuth,
  validate({ params: customerIdParams, body: createBillingRuleBody }),
  requireCustomerWrite("id"),
  async (req, res, next) => {
    try {
      const { id: customerId } = res.locals.params as { id: string };
      const body = req.body as {
        obligation_type: "INVOICE" | "SUBSCRIPTION" | "FEE" | "LEVY" | "CUSTOM";
        amount: number;
        frequency: "MONTHLY";
        day_of_month: number;
        start_date: string;
        metadata?: Record<string, unknown>;
      };

      const rule = await createBillingRule({
        customerId,
        obligationType: body.obligation_type,
        amount: body.amount,
        recurrence: body.frequency,
        dayOfMonth: body.day_of_month,
        startDate: body.start_date,
        metadata: body.metadata,
      });

      res.status(201).json({ data: rule });
    } catch (err) {
      next(err);
    }
  },
);

billingRouter.get(
  "/customers/:id/billing-rules",
  requireAuth,
  validate({ params: customerIdParams }),
  requireCustomerMember("id"),
  async (_req, res, next) => {
    try {
      const { id: customerId } = res.locals.params as { id: string };
      const rules = await listBillingRulesByCustomer(customerId);
      res.json({ data: rules });
    } catch (err) {
      next(err);
    }
  },
);
