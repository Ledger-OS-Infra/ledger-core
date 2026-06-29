import { z } from "zod";

/** Accepts any 8-4-4-4-12 hex ID stored as Postgres UUID (including dev seed IDs). */
export const uuidParam = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid UUID",
  );

export const businessIdParams = z.object({
  businessId: uuidParam,
});

export const obligationIdParams = z.object({
  obligationId: uuidParam,
});

export const customerIdParams = z.object({
  id: uuidParam,
});
