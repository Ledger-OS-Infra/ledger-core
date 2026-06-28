# Database setup guide

Steps to run Ledger-Core Postgres locally (Docker) or on Aiven, apply migrations, load dev seed data, and connect with TablePlus.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local dev)
- Node.js 20+
- Repo cloned and root dependencies installed:

```bash
git clone https://github.com/Ledger-OS-Infra/ledger--raas.git
cd ledger-core
npm install
npm install --prefix server
```

---

## Local development (Docker)

### 1. Credentials

These match `docker-compose.yml` at the repo root.

| Setting  | Value (app / CLI) | Value (TablePlus) |
|----------|-------------------|-------------------|
| Host     | `localhost`       | **`127.0.0.1`**   |
| Port     | `5432`            | `5432`            |
| User     | `user`            | `user`            |
| Password | `password`        | `password`        |
| Database | `ledger_core`     | `ledger_core`     |

> **TablePlus:** use `127.0.0.1` as the host, not `localhost`. TablePlus treats `localhost` as a reserved/special value and the connection will fail. The Node app and `DATABASE_URL` can keep using `localhost` — this only affects GUI clients.

**Connection URL**

```
postgresql://user:password@localhost:5432/ledger_core
```

**Redis**

```
redis://localhost:6379
```

### 2. Environment file

Copy the server env template and set the database URLs:

```bash
cp server/.env.example server/.env
```

In `server/.env`, ensure these lines are set for local Docker:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ledger_core
REDIS_URL=redis://localhost:6379
```

Fill in the remaining Nomba values from the team vault or `.env.example` comments.

### 3. Start Docker services

Run from the **repo root**:

```bash
# Start Postgres + Redis (detached)
docker compose up -d

# Postgres only
docker compose up -d postgres

# Check containers are running
docker compose ps
```

Wait until Postgres shows `healthy` in `docker compose ps`.

### 4. Apply schema and seed data

```bash
npm run db:setup --prefix server
```

This runs:

1. `migrate` — creates all core tables and reporting views
2. `seed` — loads sample business, 2 customers, invoice + subscription scenarios (see [Seed data](#seed-data))

Individual commands:

```bash
npm run migrate --prefix server    # schema only
npm run seed --prefix server       # seed only (safe to re-run)
```

### 5. Verify

```bash
docker exec -it ledger-core-postgres psql -U user -d ledger_core -c \
  "SELECT full_name, total_outstanding, wallet_credit FROM v_customer_balance_summary ORDER BY full_name;"
```

Expected output:

| full_name       | total_outstanding | wallet_credit |
|-----------------|-------------------|---------------|
| John Doe        | 0                 | 20000         |
| Raphael Okonkwo | 0                 | 0             |

---

## Docker commands reference

All commands run from the **repo root**.

| Action | Command |
|--------|---------|
| Start services | `docker compose up -d` |
| Stop services (keep data) | `docker compose stop` |
| Stop and remove containers | `docker compose down` |
| Wipe database and start fresh | `docker compose down -v` then `docker compose up -d` |
| View Postgres logs | `docker compose logs -f postgres` |
| View Redis logs | `docker compose logs -f redis` |
| Postgres shell | `docker exec -it ledger-core-postgres psql -U user -d ledger_core` |
| Redis CLI | `docker exec -it ledger-core-redis redis-cli` |

After `docker compose down -v`, run `npm run db:setup --prefix server` again to recreate schema and seed.

---

## TablePlus (local Docker)

### Create the connection

1. **File → New connection → PostgreSQL** (not MySQL, not MariaDB)
2. Enter credentials — **Host must be `127.0.0.1`**, not `localhost`:

   | Field    | Value           |
   |----------|-----------------|
   | Name     | `Ledger-Core Local` (any label) |
   | Host     | `127.0.0.1`     |
   | Port     | `5432`          |
   | User     | `user`          |
   | Password | `password`      |
   | Database | `ledger_core`   |

3. **Over SSH:** must be **Off / None** for local Docker. If SSH is enabled, TablePlus tries to tunnel and you will get a timeout (`system error: 60`).
4. **SSL:** off / disable
5. Click **Test** → **Save** → **Connect**

### Common mistakes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Lost connection to MySQL server…` | Wrong driver selected | Delete connection; create **PostgreSQL** |
| `system error: 60` (timeout) | **Over SSH** enabled, or Docker not running | Turn SSH off; run `docker compose ps` |
| Connection refused | Postgres container stopped | `docker compose up -d postgres` |
| `localhost` fails | TablePlus reserved word | Use `127.0.0.1` as host |

You should see tables such as `businesses`, `customers`, `payment_obligations`, `ledger_entries`, and views like `v_customer_balance_summary`.

---

## Hosted database (Aiven)

For a shared hosted Postgres (e.g. Aiven), use the **Service URI** from the Aiven console.

In `server/.env`:

```env
DATABASE_URL=postgresql://avnadmin:YOUR_PASSWORD@your-service.a.aivencloud.com:12345/defaultdb?sslmode=require
DATABASE_SSL=true
```

Then apply schema and seed against Aiven (Docker not required for this step):

```bash
npm run db:setup --prefix server
```

### TablePlus (Aiven)

1. New connection → **PostgreSQL**
2. Host, port, user, password, and database from the Aiven Service URI
3. **SSL:** on (use Aiven CA certificate if prompted)
4. Test connection → Save

---

## Seed data

Dev seed reproduces the scenarios in `TASK.md` §6:

**John Doe — invoice business**

- Invoice ₦150,000 → partial ₦70,000 → final ₦100,000 payment
- Invoice marked **PAID**; ₦20,000 overpayment in wallet

**Raphael Okonkwo — DSTV-style subscription**

- Monthly ₦6,000 MBU (June + July)
- Partial ₦4,400 on June → FIFO clearance with ₦7,600 payment in July
- Both obligations **PAID**; wallet balance ₦0

---

## Schema overview

| Table | Purpose |
|-------|---------|
| `businesses` | Tenant / business profile |
| `customers` | Customer profiles |
| `virtual_accounts` | Nomba VA mapped to customer |
| `billing_rules` | Recurring obligation config (e.g. monthly MBU) |
| `payment_obligations` | Invoices, subscriptions, fees |
| `payment_events` | Inbound transfers (webhook idempotency key) |
| `ledger_entries` | Immutable debit/credit audit trail |
| `customer_wallets` | Unallocated / overpayment credit |

Reporting view stubs: `v_customer_balance_summary`, `v_obligation_aging`, `v_business_metrics`, `v_obligation_payment_history`.

Full entity reference, ER diagram, indexes, and append-only policy: [`docs/SCHEMA.md`](./SCHEMA.md).  
Reporting views and API examples: [`docs/REPORTING_VIEWS.md`](./REPORTING_VIEWS.md).

---

## Troubleshooting

**TablePlus connection fails with `localhost`**

- Set **Host** to `127.0.0.1` instead of `localhost`.

**TablePlus shows `Lost connection to MySQL server` or `system error: 60`**

- You likely created a **MySQL** connection or left **Over SSH** enabled.
- Delete the connection and create a new **PostgreSQL** one.
- Set **Over SSH** to **Off** for local Docker.
- Confirm Docker is running: `docker compose ps` should show `ledger-core-postgres` as healthy.

**Port 5432 already in use**

- Stop another local Postgres, or change the host port in `docker-compose.yml`.

**`DATABASE_URL is required`**

- Ensure `server/.env` exists and contains `DATABASE_URL`.

**Migrations fail on Aiven**

- Confirm `?sslmode=require` is in the URL or `DATABASE_SSL=true` is set.

**Fresh database**

```bash
docker compose down -v
docker compose up -d
npm run db:setup --prefix server
```
