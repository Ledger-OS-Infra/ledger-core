# Postman — Ledger-Core API

Create users, customers, obligations, billing rules, and webhooks via the Postman flows; verify rows in TablePlus.

**No seed data** — everything is created through these API requests.

## Quick start

1. **Infra + schema**
   ```bash
   docker compose up -d
   npm run migrate --prefix server
   npm run dev --prefix server
   ```

2. **Postman**
   - Import `Ledger-Core-Local.postman_environment.json`
   - Import `Ledger-Core.postman_collection.json`
   - Select **Ledger-Core - Local**

3. **Run folder Auth** (steps 1–4):
   - **Signup** → creates user + workspace linked to Nomba sub-account
   - **Verify email** → paste token from the verification email
   - **Login** → saves `accessToken` and `refreshToken` to environment
   - **Get current user** → auto-sets `businessId` from your workspace

4. **Run folder Flow - start from scratch** (steps 1–17 in order). All protected endpoints automatically use the Bearer token from login.

5. **Optional — subscription billing:** folder **Flow - subscription billing (DSTV)** (steps 1–6). Requires steps 1–2 from the main flow so `customerId` is set.

## What gets created where

| Step | Postgres tables | Notes |
|------|-----------------|--------|
| Auth 1. Signup | `users`, `businesses`, `business_members`, `auth_tokens` | Auto-creates workspace linked to Nomba sub-account |
| Auth 3. Login | `refresh_tokens` | Issues JWT + refresh token |
| Auth 4. Get me | — | Auto-sets `businessId` from workspace |
| 2. Create customer | `customers`, `virtual_accounts`, `customer_wallets` | Also calls Nomba sandbox |
| 4. Create obligation | `payment_obligations` | Amounts in kobo |
| DSTV 1. Billing rule | `billing_rules` | Monthly ₦6,000, due on 1st |
| DSTV 3. Generate due | `payment_obligations` | Auto-creates `MBU-YYYY-MM` rows |
| 9. Webhook | `payment_events` | Redis idempotency key (no auth required) |
| 10–17. Reporting | — | Read-only; uses env IDs from earlier steps |

## Environment variables

| Variable | Initially | Set by |
|----------|-----------|--------|
| `baseUrl` | `http://localhost:3050` | — |
| `authEmail` | `demo@ledger-core.com` | — |
| `authPassword` | `Password123!` | — |
| `authName` | `Demo User` | — |
| `accessToken` | empty | Auth > Login |
| `refreshToken` | empty | Auth > Login |
| `businessId` | empty | Auth > Get current user |
| `nombaWebhookSecret` | `NombaHackathon2026` | match `server/.env` |
| `customerId` | empty | step 2 |
| `obligationId` | empty | step 4 or DSTV step 4 |
| `billingRuleId` | empty | DSTV step 1 |
| `billingAsOfDate` | `2026-07-01` | — (generates Jun + Jul MBU) |
| `amountMbuKobo` | `600000` | ₦6,000 |
| `customerAccountNumber` | empty | step 2 |
| `nombaAccountRef` | empty | step 2 |

## Subscription billing flow (DSTV)

After creating a customer (main flow step 2):

1. **Create billing rule** — `start_date: 2026-06-01`, `frequency: MONTHLY`, `amount: 600000` kobo
2. **Generate due** — `POST /billing/jobs/generate-due` with `as_of_date: 2026-07-01`
3. Expect **`MBU-2026-06`** and **`MBU-2026-07`** obligations (both `UNPAID`)
4. Re-run generate — idempotent (no duplicates)

CLI equivalent:

```bash
npm run billing:generate-due --prefix server -- 2026-07-01
```

## TablePlus checks

```sql
-- Billing rules
SELECT id, obligation_type, amount, recurrence, day_of_month, next_run_date, is_active
FROM billing_rules ORDER BY created_at DESC;

-- Subscription MBU obligations (amount / amount_paid are kobo)
SELECT reference_code, obligation_type, amount, amount_paid, status, due_date, billing_rule_id
FROM payment_obligations
WHERE obligation_type = 'SUBSCRIPTION'
ORDER BY due_date ASC;

-- Your Postman customers
SELECT id, full_name, email, created_at FROM customers ORDER BY created_at DESC;

-- Webhook payments
SELECT idempotency_key, amount, received_at FROM payment_events ORDER BY created_at DESC;
```

## Fresh database

```bash
docker compose down -v
docker compose up -d
npm run migrate --prefix server
```

Then re-run the Postman flows from Auth > Signup.

## Amounts

All `amount` fields are **kobo**: ₦1,500 → `150000`, ₦6,000 → `600000`.

## Reporting API

OpenAPI spec: [`docs/openapi.yaml`](../docs/openapi.yaml). Main flow steps 10–17 exercise all reporting endpoints using `{{businessId}}`, `{{customerId}}`, and `{{obligationId}}`.
