import { z } from "zod";

export const createBusinessBody = z.object({
  name: z.string().trim().min(1, "Business name is required").max(120),
});

export type CreateBusinessBody = z.infer<typeof createBusinessBody>;
