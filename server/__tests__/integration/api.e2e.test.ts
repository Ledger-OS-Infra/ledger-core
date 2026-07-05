import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../app";
import { pool } from "../../db/pool";
import { env } from "../../config/env";
import { redis } from "../../redis/client";
import { closeReconciliationQueue } from "../../queues/reconciliation";
import {
  startReconciliationWorker,
  stopReconciliationWorker,
} from "../../workers/reconciliationWorker";
import type { NombaWebhookPayload } from "../../nomba/verifyWebhookSignature";
import {
  buildSignedWebhookRequest,
  seedCustomerWithVirtualAccount,
  waitFor,
} from "./helpers";

describe("API integration (Postgres + Redis)", () => {
  let app: Express;
  const runId = randomUUID().slice(0, 8);
  const email = `ci-${runId}@ledger-core.test`;
  const password = "Password123!";
  let accessToken: string;
  let businessId: string;
  let customerId: string;
  const accountNumber = `811234${runId.slice(0, 4)}`;

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
        due_date: "2026-07-01",
        reference_code: `INV-CI-${runId}`,
      });

    expect(obligationRes.status).toBe(201);
    expect(obligationRes.body.data.status).toBe("UNPAID");
  });

  it("webhook → async reconciliation marks obligation PAID", async () => {
    const transactionId = `txn_ci_${runId}`;
    const payload: NombaWebhookPayload = {
      event_type: "payment_success",
      requestId: `req_ci_${runId}`,
      data: {
        merchant: { userId: "ci_merchant", walletId: "ci_wallet" },
        transaction: {
          transactionId,
          type: "virtual_account_credit",
          time: new Date().toISOString(),
          responseCode: "00",
          aliasAccountNumber: accountNumber,
          aliasAccountReference: `INV-CI-${runId}`,
          transactionAmount: 500_000,
        },
        customer: {
          senderName: "CI Sender",
          bankName: "Test Bank",
          accountNumber: "0123456789",
        },
      },
    };

    const { signature, timestamp } = buildSignedWebhookRequest(payload);

    const webhookRes = await request(app)
      .post(env.nombaWebhookPath)
      .set("nomba-signature", signature)
      .set("nomba-timestamp", timestamp)
      .send(payload);

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body).toEqual({ received: true });

    await waitFor(async () => {
      const { rows } = await pool.query<{ status: string }>(
        `SELECT status FROM payment_obligations
         WHERE customer_id = $1 AND reference_code = $2`,
        [customerId, `INV-CI-${runId}`],
      );
      return rows[0]?.status === "PAID";
    });

    const metricsRes = await request(app)
      .get(`/reporting/business/${businessId}/metrics`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(metricsRes.status).toBe(200);
    expect(Number(metricsRes.body.data.total_inflow)).toBeGreaterThan(0);
  });

  it("deduplicates repeat webhook deliveries via Redis", async () => {
    const transactionId = `txn_dup_${runId}`;
    const payload: NombaWebhookPayload = {
      event_type: "payment_success",
      requestId: `req_dup_${runId}`,
      data: {
        merchant: { userId: "ci_merchant", walletId: "ci_wallet" },
        transaction: {
          transactionId,
          type: "virtual_account_credit",
          time: new Date().toISOString(),
          responseCode: "00",
          aliasAccountNumber: accountNumber,
          aliasAccountReference: `INV-DUP-${runId}`,
          transactionAmount: 100_000,
        },
        customer: {
          senderName: "CI Sender",
          bankName: "Test Bank",
          accountNumber: "0123456789",
        },
      },
    };

    const { signature, timestamp } = buildSignedWebhookRequest(payload);

    const first = await request(app)
      .post(env.nombaWebhookPath)
      .set("nomba-signature", signature)
      .set("nomba-timestamp", timestamp)
      .send(payload);

    const second = await request(app)
      .post(env.nombaWebhookPath)
      .set("nomba-signature", signature)
      .set("nomba-timestamp", timestamp)
      .send(payload);

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ received: true });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ received: true, duplicate: true });

    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::TEXT AS count FROM payment_events WHERE idempotency_key = $1`,
      [transactionId],
    );
    expect(Number(rows[0]?.count ?? 0)).toBe(1);
  });
});
