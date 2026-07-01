# Postman — Ledger-Core API

Create customers, obligations, and webhooks via the Postman flow; verify rows in TablePlus.

## Quick start

1. **Infra + schema + tenant row**
   ```bash
   docker compose up -d
   npm run migrate --prefix server
   npm run db:bootstrap --prefix server   # one business row only
   npm run dev --prefix server
   ```

   **TablePlus alternative** to `db:bootstrap`: run `bootstrap-business.sql` in this folder after migrate.

2. **Postman**
   - Import `Ledger-Core-Local.postman_environment.json`
   - Import `Ledger-Core.postman_collection.json`
   - Select **Ledger-Core - Local**

3. **Run** folder **Flow - start from scratch** (steps 1–11 in order).

## What gets created where

| Step | Postgres tables | Notes |
|------|-----------------|--------|
| `db:bootstrap` | `businesses` | 1 row — `businessId` in env |
| 2. Create customer | `customers`, `virtual_accounts`, `customer_wallets` | Also calls Nomba sandbox |
| 4. Create obligation | `payment_obligations` | Amounts in kobo |
| 9. Webhook | `payment_events` | Redis idempotency key |

## Environment variables

| Variable | Initially | Set by |
|----------|-----------|--------|
| `baseUrl` | `http://localhost:3050` | — |
| `businessId` | bootstrap business UUID | `db:bootstrap` or SQL |
| `nombaWebhookSecret` | `NombaHackathon2026` | match `server/.env` |
| `customerId` | empty | step 2 |
| `obligationId` | empty | step 4 |
| `customerAccountNumber` | empty | step 2 |
| `nombaAccountRef` | empty | step 2 |

## TablePlus checks

```sql
-- Your Postman customers
SELECT id, full_name, email, created_at FROM customers ORDER BY created_at DESC;

-- Obligations (amount / amount_paid are kobo)
SELECT reference_code, obligation_type, amount, amount_paid, status
FROM payment_obligations ORDER BY created_at DESC;

-- Webhook payments
SELECT idempotency_key, amount, received_at FROM payment_events ORDER BY created_at DESC;
```

## Fresh database (no seed)

```bash
docker compose down -v
docker compose up -d
npm run migrate --prefix server
npm run db:bootstrap --prefix server
```

## Amounts

All `amount` fields are **kobo**: ₦1,500 → `150000`, ₦6,000 → `600000`.

## Optional demo seed

`npm run seed` loads John/Raphael TASK.md scenarios — **not needed** for Postman manual testing.
