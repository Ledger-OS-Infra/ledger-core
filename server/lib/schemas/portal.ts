import { z } from "zod";

export const portalLookupBody = z.object({
  account_number: z.string().trim().min(1, "Account number is required"),
  email: z.string().trim().email("Enter a valid email address"),
});

export type PortalLookupBody = z.infer<typeof portalLookupBody>;