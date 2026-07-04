import { Router, type Request, type Response } from "express";
import { validate } from "../middleware/validate";
import { createBusinessBody } from "../lib/schemas/businesses";
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
// Creates a workspace tied to the team's shared Nomba sub-account.
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
