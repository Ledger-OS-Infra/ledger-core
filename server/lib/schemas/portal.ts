import { z } from "zod";

export const portalLookupBody = z.object({
  account_number: z.string().trim().min(1, "Account number is required"),
  email: z.string().trim().email("Enter a valid email address"),
});

// NEW
export const portalLoginBody = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const portalForgotPasswordBody = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const portalResetPasswordBody = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type PortalLookupBody = z.infer<typeof portalLookupBody>;
export type PortalLoginBody = z.infer<typeof portalLoginBody>;
export type PortalForgotPasswordBody = z.infer<typeof portalForgotPasswordBody>;
export type PortalResetPasswordBody = z.infer<typeof portalResetPasswordBody>;