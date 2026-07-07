/**
 * Vercel root serverless entry (GET /). Must default-export a request handler.
 * api/index.ts re-exports the same handler for /api rewrites.
 */
import type { Request, Response } from "express";
import "./instrument";
import { createApp } from "./app";

const app = createApp();

export default function handler(req: Request, res: Response): void {
  app(req, res);
}
