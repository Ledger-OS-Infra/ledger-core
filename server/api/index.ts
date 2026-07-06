/**
 * Vercel serverless entry — must export a request handler (not only an Express app).
 * Uses `export =` so tsc emits `module.exports = handler` for the Vercel CJS runtime.
 */
import type { Request, Response } from "express";
import "../instrument";
import { createApp } from "../app";

const app = createApp();

function handler(req: Request, res: Response): void {
  app(req, res);
}

export = handler;
