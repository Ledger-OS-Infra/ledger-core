/**
 * Vercel serverless entry for /api rewrites — same handler as index.ts.
 * Uses `export =` so tsc emits `module.exports = handler` for the Vercel CJS runtime.
 */
import handler from "../index";

export = handler;
