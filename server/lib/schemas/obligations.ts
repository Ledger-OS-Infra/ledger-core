import { z } from "zod";
import {
  OBLIGATION_STATUSES,
  OBLIGATION_TYPES,
} from "../obligations/status";

export const obligationTypeSchema = z.enum(OBLIGATION_TYPES);

export const obligationStatusSchema = z.enum(OBLIGATION_STATUSES);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "due_date must be YYYY-MM-DD");

export const createObligationBody = z.object({
  type: obligationTypeSchema,
  amount: z
    .number()
    .int()
    .positive()
    .describe("Amount in kobo (1 NGN = 100 kobo; e.g. ₦1,500 = 150000)"),
  due_date: isoDateSchema,
  reference_code: z.string().trim().min(1).max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const patchObligationBody = z
  .object({
    type: obligationTypeSchema.optional(),
    amount: z
      .number()
      .int()
      .positive()
      .describe("Amount in kobo (1 NGN = 100 kobo)")
      .optional(),
    due_date: isoDateSchema.optional(),
    reference_code: z.string().trim().min(1).max(128).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const listObligationsQuery = z.object({
  status: obligationStatusSchema.optional(),
  type: obligationTypeSchema.optional(),
});

export type CreateObligationBody = z.infer<typeof createObligationBody>;
export type PatchObligationBody = z.infer<typeof patchObligationBody>;
export type ListObligationsQuery = z.infer<typeof listObligationsQuery>;
