import { Router, type Request, type Response } from "express";
import { createBusinessBody } from "../lib/schemas/businesses";
import { validate } from "../middleware/validate";
import { createBusiness, listWorkspaces } from "../services/businesses";

export const businessesRouter = Router();

// ── GET /businesses ─────────────────────────────────
// Lists the authenticated user's workspaces.
businessesRouter.get("/", async (req: Request, res: Response, next) => {
  try {
    const workspaces = await listWorkspaces(req.user!.sub);
    res.json({ data: workspaces });
  } catch (err) {
    next(err);
  }
});

// ── POST /businesses ────────────────────────────────
// Creates a workspace for the authenticated user.
businessesRouter.post(
  "/",
  validate({ body: createBusinessBody }),
  async (req: Request, res: Response, next) => {
    try {
      const { name } = req.body as { name: string };
      const workspace = await createBusiness({
        userId: req.user!.sub,
        name,
      });
      res.status(201).json({ data: workspace });
    } catch (err) {
      next(err);
    }
  },
);
