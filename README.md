# Ledger-Core

**Universal Reconciliation Engine** built on [Nomba Virtual Accounts](https://developer.nomba.com)

> Every bank transfer becomes a structured financial event — not just a notification.

Ledger-Core automatically captures inbound transfers, matches them to outstanding payment obligations (invoices, subscriptions, fees), and maintains a complete, immutable customer-level ledger in real time.

Built for the **Nomba x DevCareer Hackathon 2026**.

---

## The Problem

Businesses collecting payments via bank transfer know *that* money arrived — but not *what it means*:

- Which customer sent it?
- Which invoice or subscription does it cover?
- Is it a full, partial, or overpayment?
- What's the customer's outstanding balance now?

Even with virtual accounts, money arriving does not equal money understood.

## The Solution

Ledger-Core is a reconciliation infrastructure layer that:

1. Assigns each customer a unique Nomba Virtual Account
2. Captures inbound transfers automatically via webhooks
3. Matches every payment to the correct customer and obligation
4. Applies smart allocation logic — full, partial, overpayment, FIFO, or exact match
5. Maintains an immutable double-entry-style customer ledger
6. Exposes real-time dashboards and APIs for business reporting

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js (TypeScript), Express 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Financial Integration | Nomba Virtual Accounts & Webhooks |
| Validation | Zod |
| Frontend | React 19, Vite, TypeScript |
| Testing | Vitest |
| Logging | Pino |
| Infrastructure | Docker, GitHub Actions |

## Project Structure

```
ledger-core/
├── server/                # Express API and reconciliation engine
│   ├── nomba/             # Nomba API client, auth, webhook verification
│   ├── db/                # Knex migrations, seeds, connection pool
│   │   ├── migrations/    # Schema and reporting view definitions
│   │   └── seeds/         # Dev seed data (invoice + subscription scenarios)
│   ├── routes/            # Webhook handler, reporting endpoints
│   ├── middleware/        # Error handling, request logging, validation
│   ├── lib/               # AppError, logger, param helpers
│   ├── redis/             # Redis client
│   └── config/            # Environment config
├── frontend/              # React admin dashboard (Vite)
├── docs/                  # Schema, database setup, reporting views
├── scripts/               # Repo automation
└── docker-compose.yml     # Postgres + Redis for local dev
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Git

### 1. Clone and install

```bash
git clone https://github.com/Ledger-OS-Infra/ledger--raas.git
cd ledger--raas
npm install
npm install --prefix server
npm install --prefix frontend
```

### 2. Set up environment variables

```bash
cp server/.env.example server/.env
```

Fill in the Nomba credentials from the team vault. For local development, the database and Redis URLs are pre-configured for Docker:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ledger_core
REDIS_URL=redis://localhost:6379
```

### 3. Start Docker services

```bash
docker compose up -d
```

Wait until Postgres shows `healthy`:

```bash
docker compose ps
```

### 4. Run migrations and seed data

```bash
npm run db:setup --prefix server
```

This creates all tables, reporting views, and loads dev seed data (invoice + subscription scenarios from `TASK.md`).

### 5. Start the server

```bash
npm run dev --prefix server
```

The API runs on `http://localhost:3050`.

### 6. Start the frontend

```bash
npm run dev --prefix frontend
```

### 7. Verify

```bash
curl http://localhost:3050/reporting/business/11111111-1111-1111-1111-111111111101/metrics
```

---

## API Endpoints

### Reporting

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/reporting/business/:businessId/metrics` | Business-level totals |
| `GET` | `/reporting/business/:businessId/customers` | Customer balance summaries |
| `GET` | `/reporting/business/:businessId/aging` | Obligation aging report |
| `GET` | `/reporting/obligations/:obligationId/payments` | Payment history per obligation |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/nomba` | Nomba inbound transfer webhook |

---

## Database

8 core tables and 5 reporting views. See [docs/SCHEMA.md](docs/SCHEMA.md) for the full entity reference, ER diagram, and append-only policy.

| Table | Purpose |
|-------|---------|
| `businesses` | Tenant / business profile |
| `customers` | Customer profiles |
| `virtual_accounts` | Nomba VA mapped to customer |
| `billing_rules` | Recurring obligation config |
| `payment_obligations` | Invoices, subscriptions, fees |
| `payment_events` | Inbound transfers (append-only) |
| `ledger_entries` | Immutable debit/credit audit trail |
| `customer_wallets` | Unallocated / overpayment credit |

For database setup, Docker commands, TablePlus connection, and troubleshooting, see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

---

## Contributing

See [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md) for branch naming, commit conventions, PR process, and code standards.

**Quick reference:**

- **Branches**: `feat/<scope>-<description>`, `fix/<scope>-<description>`, `docs/<description>`
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) enforced via Husky + Commitlint
- **PRs**: Fill out the template, link issues, request review before merge
- **Ledger data is append-only**: never add UPDATE/DELETE paths for `ledger_entries` or `payment_events`

---

## Documentation

| Document | Description |
|----------|-------------|
| [TASK.md](TASK.md) | Full product spec, reconciliation logic, and example flows |
| [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md) | Branch naming, commit conventions, PR process |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Database schema, ER diagram, indexes, append-only policy |
| [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) | Local Docker and Aiven setup, TablePlus guide |
| [docs/REPORTING_VIEWS.md](docs/REPORTING_VIEWS.md) | Reporting views, example queries, API endpoints |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Run the full stack in Docker for the hackathon demo |

---

## License

[Apache License 2.0](LICENSE)

---

*Ledger-Core — Nomba x DevCareer Hackathon 2026*
