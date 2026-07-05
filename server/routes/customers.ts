import { Router } from "express";
import { AppError } from "../lib/AppError";
import {
  findCustomerByAccountNumber,
  getCustomerById,
  listCustomersByBusiness,
  updateCustomer,
} from "../db/customers";
import {
  createCustomerBody,
  customerIdParams,
  listCustomersQuery,
  updateCustomerBody,
} from "../lib/schemas/customers";
import {
  requireBusinessMemberFromQuery,
  requireBusinessWriteFromBody,
  requireCustomerMember,
  requireCustomerWrite,
} from "../middleware/businessAccess";
import { validate } from "../middleware/validate";
import { getCustomerService } from "../services/customers";

export const customersRouter = Router();

customersRouter.post(
  "/",
  validate({ body: createCustomerBody }),
  requireBusinessWriteFromBody("business_id"),
  async (req, res, next) => {
    try {
      const body = req.body as {
        business_id: string;
        full_name: string;
        email?: string | null;
        phone?: string | null;
        metadata?: Record<string, unknown>;
      };

      const customer = await getCustomerService().createCustomer({
        businessId: body.business_id,
        fullName: body.full_name,
        email: body.email,
        phone: body.phone,
        metadata: body.metadata,
      });

      res.status(201).json({ data: customer });
    } catch (err) {
      next(err);
    }
  },
);

customersRouter.get(
  "/",
  validate({ query: listCustomersQuery }),
  requireBusinessMemberFromQuery("business_id"),
  async (_req, res, next) => {
    try {
      const { business_id, account_number } = res.locals.query as {
        business_id?: string;
        account_number?: string;
      };

      if (!account_number) {
        const customers = await listCustomersByBusiness(business_id!);
        res.json({ data: customers });
        return;
      }

      const customer = await findCustomerByAccountNumber(account_number);

      if (!customer || customer.business_id !== business_id) {
        throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      res.json({ data: customer });
    } catch (err) {
      next(err);
    }
  },
);

customersRouter.get(
  "/:id",
  validate({ params: customerIdParams }),
  requireCustomerMember("id"),
  async (_req, res, next) => {
    try {
      const { id } = res.locals.params as { id: string };
      const customer = await getCustomerById(id);

      if (!customer) {
        throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      res.json({ data: customer });
    } catch (err) {
      next(err);
    }
  },
);

customersRouter.patch(
  "/:id",
  validate({ params: customerIdParams, body: updateCustomerBody }),
  requireCustomerWrite("id"),
  async (req, res, next) => {
    try {
      const { id } = res.locals.params as { id: string };
      const body = req.body as {
        full_name?: string;
        email?: string | null;
        phone?: string | null;
        status?: "ACTIVE" | "INACTIVE";
        metadata?: Record<string, unknown>;
      };

      const customer = await updateCustomer(id, {
        fullName: body.full_name,
        email: body.email,
        phone: body.phone,
        status: body.status,
        metadata: body.metadata,
      });

      if (!customer) {
        throw new AppError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      res.json({ data: customer });
    } catch (err) {
      next(err);
    }
  },
);
