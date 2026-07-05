import { Router, type Request, type Response } from "express";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/requireAuth";
import {
  loginRateLimit,
  forgotPasswordRateLimit,
  signupRateLimit,
  refreshRateLimit,
  resetPasswordRateLimit,
} from "../middleware/rateLimit";
import {
  signupBody,
  loginBody,
  verifyEmailQuery,
  forgotPasswordBody,
  resetPasswordBody,
} from "../lib/schemas/auth";
import * as authService from "../services/auth";

export const authRouter = Router();

// ── POST /auth/signup ───────────────────────────────
authRouter.post(
  "/signup",
  signupRateLimit,
  validate({ body: signupBody }),
  async (req: Request, res: Response, next) => {
    try {
      const { full_name, email, password } = req.body as {
        full_name: string;
        email: string;
        password: string;
      };
      const result = await authService.signup({
        fullName: full_name,
        email,
        password,
      });
      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/login ────────────────────────────────
authRouter.post(
  "/login",
  loginRateLimit,
  validate({ body: loginBody }),
  async (req: Request, res: Response, next) => {
    try {
      const { email, password } = req.body as {
        email: string;
        password: string;
      };
      const result = await authService.login({ email, password });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /auth/verify-email ──────────────────────────
authRouter.get(
  "/verify-email",
  validate({ query: verifyEmailQuery }),
  async (req: Request, res: Response, next) => {
    try {
      const { token } = res.locals.query as { token: string };
      const result = await authService.verifyEmail(token);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/forgot-password ──────────────────────
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  validate({ body: forgotPasswordBody }),
  async (req: Request, res: Response, next) => {
    try {
      const { email } = req.body as { email: string };
      const result = await authService.forgotPassword(email);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/reset-password ───────────────────────
authRouter.post(
  "/reset-password",
  resetPasswordRateLimit,
  validate({ body: resetPasswordBody }),
  async (req: Request, res: Response, next) => {
    try {
      const { token, password } = req.body as {
        token: string;
        password: string;
      };
      const result = await authService.resetPassword({ token, password });
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /auth/refresh ──────────────────────────────
authRouter.post(
  "/refresh",
  refreshRateLimit,
  async (req: Request, res: Response, next) => {
    try {
      const { refresh_token } = req.body as { refresh_token?: string };
      if (!refresh_token) {
        res.status(400).json({
          error: { message: "refresh_token is required", code: "VALIDATION_ERROR" },
        });
        return;
      }
      const result = await authService.refreshAccessToken(refresh_token);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /auth/me ────────────────────────────────────
authRouter.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next) => {
    try {
      const result = await authService.getMe(req.user!.sub);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  },
);
