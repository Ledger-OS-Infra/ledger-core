/**
 * Vercel root serverless entry (GET /). Must default-export a request handler.
 * Named expressApp.ts (not app.ts) so Vercel does not treat it as the lambda entry.
 */
import type { Request, Response } from "express";
import "./instrument";
import { createApp } from "./expressApp";

const app = createApp();

export default function handler(req: Request, res: Response): void {
  app(req, res);
}
