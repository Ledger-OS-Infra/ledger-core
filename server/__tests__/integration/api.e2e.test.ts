import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../expressApp";
import { pool } from "../../db/pool";
import { redis } from "../../redis/client";
import { closeReconciliationQueue } from "../../queues/reconciliation";
import {
  startReconciliationWorker,
  stopReconciliationWorker,
} from "../../workers/reconciliationWorker";
import { seedCustomerWithVirtualAccount } from "./helpers";
import { integrationLive } from "./live";

function buildDryRunPlan() {
  const runId = randomUUID().slice(0, 8);
  const email = `ci-${runId}@ledger-core.test`;
  const password = "Password123!";
  const accountNumber = `811234${runId.slice(0, 4)}`;
  const obligationDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return {
    runId,
    email,
    password,
    accountNumber,
    obligationDueDate,
    steps: [
      { method: "GET", path: "/health", expect: { status: "ok" } },
      { method: "GET", path: "/businesses", expect: "401 without token" },
      {
        method: "POST",
        path: "/auth/signup",
        body: { full_name: "CI User", email, password },
        expect: "201",
        emailDryRun:
          "verification email printed to console (NODE_ENV=test), not sent via SMTP",
      },
      {
        method: "POST",
        path: "/auth/login",
        body: { email, password },
        expect: "200 + accessToken",
      },
      {
        method: "POST",
        path: "/businesses",
        body: { name: `CI Workspace ${runId}` },
        expect: "201 + businessId",
      },
      {
        method: "SEED",
        description: "insert customer + virtual_account",
        data: {
          fullName: "CI Customer",
          accountNumber,
        },
      },
      {
        method: "POST",
        path: `/customers/{customerId}/obligations`,
        body: {
          type: "INVOICE",
          amount: 500_000,
          due_date: obligationDueDate,
          reference_code: `INV-CI-${runId}`,
        },
        expect: "201 UNPAID",
      },
    ],
  };
}

if (!integrationLive()) {
  describe("API integration (dry-run)", () => {
    it("prints the full flow without writing to Postgres or Redis", () => {
      const plan = buildDryRunPlan();
      console.log("\n=== Integration test plan (dry-run) ===\n");
      console.log(JSON.stringify(plan, null, 2));
      expect(plan.steps.length).toBeGreaterThan(0);
    });
  });
} else {
  describe("API integration (Postgres + Redis)", () => {
    let app: Express;
    const runId = randomUUID().slice(0, 8);
    const email = `ci-${runId}@ledger-core.test`;
    const password = "Password123!";
    let accessToken: string;
    let businessId: string;
    let customerId: string;
    const accountNumber = `811234${runId.slice(0, 4)}`;
    const obligationDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    beforeAll(async () => {
      await startReconciliationWorker();
      app = createApp();
    });

    afterAll(async () => {
      await stopReconciliationWorker();
      await closeReconciliationQueue();
      await pool.end();
      await redis.quit();
    });

    it("GET /health returns ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("rejects protected routes without a token", async () => {
      const res = await request(app).get("/businesses");
      expect(res.status).toBe(401);
    });

    it("signup → login → create workspace", async () => {
      const signupRes = await request(app)
        .post("/auth/signup")
        .send({ full_name: "CI User", email, password });

      expect(signupRes.status).toBe(201);

      const loginRes = await request(app)
        .post("/auth/login")
        .send({ email, password });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeTruthy();
      accessToken = loginRes.body.data.accessToken as string;

      const businessRes = await request(app)
        .post("/businesses")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ name: `CI Workspace ${runId}` });

      expect(businessRes.status).toBe(201);
      businessId = businessRes.body.data.businessId as string;
      expect(businessId).toBeTruthy();
    });

    it("creates an obligation for a seeded customer", async () => {
      const seeded = await seedCustomerWithVirtualAccount({
        businessId,
        fullName: "CI Customer",
        accountNumber,
      });
      customerId = seeded.customerId;

      const obligationRes = await request(app)
        .post(`/customers/${customerId}/obligations`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          type: "INVOICE",
          amount: 500_000,
          due_date: obligationDueDate,
          reference_code: `INV-CI-${runId}`,
        });

      expect(obligationRes.status).toBe(201);
      expect(obligationRes.body.data.status).toBe("UNPAID");
    });
  });
}
