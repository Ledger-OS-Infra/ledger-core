import { z } from "zod";
import { obligationTypeSchema } from "./obligations";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");

export const billingRecurrenceSchema = z.enum(["MONTHLY"]);

export const createBillingRuleBody = z.object({
  obligation_type: obligationTypeSchema.default("SUBSCRIPTION"),
  amount: z
    .number()
    .int()
    .positive()
    .describe("Amount in kobo (1 NGN = 100 kobo; e.g. ₦6,000 = 600000)"),
  frequency: billingRecurrenceSchema,
  day_of_month: z.number().int().min(1).max(28).default(1),
  start_date: isoDateSchema.describe("First due date; also seeds next_run_date"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const generateDueBody = z
  .object({
    as_of_date: isoDateSchema.optional(),
  })
  .default({});

export const generateRuleBody = z
  .object({
    as_of_date: isoDateSchema.optional(),
  })
  .default({});

export const billingRuleIdParams = z.object({
  ruleId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Invalid UUID",
    ),
});

export type CreateBillingRuleBody = z.infer<typeof createBillingRuleBody>;
export type GenerateDueBody = z.infer<typeof generateDueBody>;
