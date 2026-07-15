import { z } from "zod";
import { uuidParam } from "../params";

export const customerIdParams = z.object({
  id: uuidParam,
});

export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const createCustomerBody = z.object({
  business_id: uuidParam,
  full_name: z.string().trim().min(1, "full_name is required"),
  email: z.string().trim().email("Invalid email"),
  phone: z.string().trim().min(1).optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateCustomerBody = z
  .object({
    full_name: z.string().trim().min(1).optional(),
    email: z.string().trim().email("Invalid email").nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    status: customerStatusSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (value) =>
      value.full_name !== undefined ||
      value.email !== undefined ||
      value.phone !== undefined ||
      value.status !== undefined ||
      value.metadata !== undefined,
    { message: "At least one field must be provided" },
  );

export const listCustomersQuery = z
  .object({
    business_id: uuidParam.optional(),
    account_number: z.string().trim().min(1).optional(),
  })
  .refine(
    (value) => value.business_id !== undefined || value.account_number !== undefined,
    { message: "business_id or account_number is required" },
  )
  .refine(
    (value) => !value.account_number || value.business_id !== undefined,
    { message: "business_id is required when using account_number" },
  );

export type CreateCustomerBody = z.infer<typeof createCustomerBody>;
export type UpdateCustomerBody = z.infer<typeof updateCustomerBody>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuery>;
