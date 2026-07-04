import { z } from "zod";

export const signupBody = z.object({
  full_name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export const loginBody = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailQuery = z.object({
  token: z.string().min(1, "Token is required"),
});

export const forgotPasswordBody = z.object({
  email: z.string().trim().email("Invalid email"),
});

export const resetPasswordBody = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
});

export type SignupBody = z.infer<typeof signupBody>;
export type LoginBody = z.infer<typeof loginBody>;
export type VerifyEmailQuery = z.infer<typeof verifyEmailQuery>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;
