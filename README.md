# LedgerCore

**Universal Reconciliation Engine** built on [Nomba Virtual Accounts](https://developer.nomba.com)

> Every bank transfer becomes a structured financial event — not just a notification.

LedgerCore automatically captures inbound transfers, matches them to outstanding payment obligations (invoices, subscriptions, fees), and maintains a complete, immutable customer-level ledger in real time.

Built for the **Nomba × DevCareer Hackathon 2026**.

---

## The Problem

Businesses collecting payments via bank transfer know *that* money arrived — but not *what it means*:

- Which customer sent it?
- Which invoice or subscription does it cover?
- Is it a full, partial, or overpayment?
- What is the customer's outstanding balance now?

Even with virtual accounts, money arriving does not equal money understood.

## The Solution

LedgerCore is a reconciliation infrastructure layer that:

1. Assigns each customer a unique Nomba Virtual Account
2. Captures inbound transfers automatically via signed webhooks
3. Deduplicates with Redis idempotency — no double-processing on retries
4. Matches every payment to the correct customer and obligation via a hybrid cascade
5. Applies smart allocation logic — full, partial, overpayment, and wallet credit
6. Writes every financial event to an immutable, append-only ledger
7. Exposes real-time dashboards and reporting APIs for business operators

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js 20, TypeScript, Express 5 |
| Queue | BullMQ + Redis 7 (Aiven Valkey in production) |
| Database | PostgreSQL 16 (Aiven in production) |
| Auth | JWT (access + refresh tokens), Bcrypt, Nodemailer |
| Validation | Zod |
| Frontend | Next.js 16, React Query, Tailwind CSS, shadcn/ui |
| Logging | Pino + pino-http |
| Monitoring | Sentry (server + frontend) |
| Testing | Vitest |
| Infrastructure | Docker, docker-compose |
| Payment integration | Nomba Virtual Accounts API + Webhooks |

---

## Project Structure

```
ledger-core/
├── server/                        # Express API and reconciliation engine
│   ├── config/                    # Environment config and mailer setup
│   ├── db/
│   │   ├── migrations/            # Schema, reporting views, auth tables
│   │   └── seeds/                 # Dev seed data
│   ├── lib/
│   │   ├── reconciliation/        # matchPayment(), allocatePayment(), processPaymentEvent()
│   │   ├── schemas/               # Zod request schemas
│   │   └── AppError, logger, ...  # Shared utilities
│   ├── middleware/                 # Auth guard, rate limiting, error handler, request logger
│   ├── nomba/                     # Nomba API client, auth, webhook signature verification
│   ├── queues/                    # BullMQ queue definitions
│   ├── redis/                     # Redis/Valkey client and BullMQ connection
│   ├── routes/                    # auth, businesses, customers, obligations, billing, reporting, webhooks
│   ├── scripts/                   # Bootstrap, manual test, and developer utility scripts
│   ├── workers/
│   │   ├── reconciliationWorker.ts      # Async payment reconciliation pipeline
│   │   └── billingObligationWorker.ts   # Recurring obligation cron generator
│   ├── instrument.ts              # Sentry init — must be first import
│   └── index.ts                   # App entry point
├── frontend/                      # Next.js admin dashboard
│   ├── app/
│   │   ├── auth/                  # Login, signup, forgot/reset password, email verify
│   │   ├── dashboard/             # Business metrics and inflow overview
│   │   ├── customers/             # Customer list and detail pages
│   │   ├── obligations/           # Obligation management
│   │   ├── transactions/          # Payment event log
│   │   ├── billing-rules/         # Recurring billing rule config
│   │   ├── reports/               # Aging, payment history, balance reports
│   │   └── settings/              # Business profile settings
│   ├── components/                # Shared UI components
│   ├── hooks/                     # Auth hook and form validation
│   └── lib/                       # API client, query hooks, formatters
├── postman/                       # Postman collection and environments
├── docs/                          # Schema, database setup, reporting views, OpenAPI
├── docker-compose.yml             # Postgres + Redis for local dev
└── docker-compose.prod.yml        # Production multi-stage build
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`) — used by the frontend
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Clone and install

```bash
git clone https://github.com/Ledger-OS-Infra/ledger-core.git
cd ledger-core

# Server
npm install --prefix server

# Frontend
pnpm install --prefix frontend
```

### 2. Set up environment variables

```bash
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env.local
```

Fill in the values from the team vault. For local development the database and Redis URLs are pre-configured for Docker:

```env
# server/.env (key vars)
DATABASE_URL=postgresql://user:password@localhost:5432/ledger_core
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
NOMBA_CLIENT_ID=...
NOMBA_CLIENT_SECRET=...
SENTRY_DSN=                  # optional — app starts without it
```

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3050
NEXT_PUBLIC_SENTRY_DSN=      # optional
```

### 3. Start Docker services

```bash
docker compose up -d
```

Wait until both services show `healthy`:

```bash
docker compose ps
```

### 4. Run migrations and bootstrap tenant

```bash
npm run db:setup --prefix server
```

Creates all tables, reporting views, indexes, and a seed `businesses` row for local testing.

### 5. Start the server

```bash
npm run dev --prefix server
```

API runs on `http://localhost:3050`.

### 6. Start the frontend

```bash
pnpm run dev --prefix frontend
```

Dashboard runs on `http://localhost:3000`.

### 7. Create test data via Postman

Import the collection and environment from [`postman/`](postman/), then run **Flow — start from scratch** (see [`postman/README.md`](postman/README.md)).

### 8. Verify

```bash
curl http://localhost:3050/health
```

---

## API Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new business account |
| `POST` | `/auth/login` | Login and receive access + refresh tokens |
| `POST` | `/auth/refresh` | Rotate refresh token |
| `POST` | `/auth/logout` | Revoke refresh token |
| `POST` | `/auth/forgot-password` | Send password reset email |
| `POST` | `/auth/reset-password` | Reset password via token |
| `POST` | `/auth/verify-email` | Confirm email address |

> All routes below require `Authorization: Bearer <access_token>`

### Businesses

| Method | Path | Description |
|---|---|---|
| `GET` | `/businesses/:id` | Get business profile |
| `PATCH` | `/businesses/:id` | Update business settings |

### Customers

| Method | Path | Description |
|---|---|---|
| `GET` | `/customers` | List customers (paginated) |
| `POST` | `/customers` | Create customer + provision Nomba VA |
| `GET` | `/customers/:id` | Customer profile and VA detail |
| `PATCH` | `/customers/:id` | Update customer |

### Obligations

| Method | Path | Description |
|---|---|---|
| `GET` | `/obligations` | List obligations (paginated, filterable by status) |
| `POST` | `/obligations` | Create obligation (invoice, subscription, fee, etc.) |
| `GET` | `/obligations/:id` | Obligation detail |
| `PATCH` | `/obligations/:id` | Update obligation |
| `DELETE` | `/obligations/:id` | Remove obligation |

### Billing Rules

| Method | Path | Description |
|---|---|---|
| `GET` | `/billing` | List billing rules |
| `POST` | `/billing` | Create recurring billing rule |
| `DELETE` | `/billing/:id` | Remove billing rule |

### Reporting

| Method | Path | Description |
|---|---|---|
| `GET` | `/reporting/business/:id/metrics` | Business-level totals |
| `GET` | `/reporting/business/:id/customers` | Customer balance summaries (paginated) |
| `GET` | `/reporting/business/:id/aging` | Aging report — 30/60/90+ day buckets (paginated) |
| `GET` | `/reporting/customers/:id` | Customer balance view |
| `GET` | `/reporting/customers/:id/obligations` | Outstanding obligations (paginated) |
| `GET` | `/reporting/customers/:id/ledger` | Ledger entry history (paginated) |
| `GET` | `/reporting/obligations/:id` | Obligation detail and aging |
| `GET` | `/reporting/obligations/:id/payments` | Payment history (paginated) |

### Webhooks

| Method | Path | Description |
|---|---|---|
| `POST` | `/webhooks/nomba` | Nomba inbound transfer event |

---

## Reconciliation Pipeline

```
Nomba VA receives transfer
        │
        ▼
POST /webhooks/nomba
  ├── HMAC-SHA512 signature verified
  ├── Redis idempotency check (duplicate = no-op)
  ├── Customer resolved via virtual account number
  ├── Payment event persisted
  └── BullMQ job enqueued
              │
              ▼
      Reconciliation Worker
       processPaymentEvent()
         ├── matchPayment()
         │     1. Exact amount match
         │     2. Reference code match
         │     3. FIFO fallback
         └── allocatePayment()  ← atomic DB transaction
               ├── Full payment  → obligation PAID, ledger: PAYMENT_APPLIED
               ├── Partial       → obligation PARTIAL, ledger: PARTIAL_PAYMENT
               └── Overpayment  → obligation PAID + wallet credit
                                   ledger: OVERPAYMENT_CREDIT + WALLET_APPLIED
```

---

## Database

8 core tables and 5 reporting views. See [docs/SCHEMA.md](docs/SCHEMA.md) for the full entity reference and ER diagram.

| Table | Purpose |
|---|---|
| `businesses` | Tenant / business profile |
| `customers` | Customer profiles linked to a business |
| `virtual_accounts` | Nomba VA assigned per customer |
| `billing_rules` | Recurring obligation generation config |
| `payment_obligations` | Invoices, subscriptions, fees — with status lifecycle |
| `payment_events` | Inbound transfers (append-only) |
| `ledger_entries` | Immutable debit/credit audit trail |
| `customer_wallets` | Per-customer wallet credit balance |

**All monetary values are stored as integers in kobo** (1 NGN = 100 kobo) to eliminate floating-point rounding errors.

For local Docker setup, Aiven connection, and TablePlus config see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md).

---

## Running Tests

```bash
npm test --prefix server
```

55 unit tests covering reconciliation matching, payment allocation, billing rule generation, and customer services.

---

## Production Deployment

```bash
docker compose -f docker-compose.prod.yml up --build
```

Multi-stage Dockerfiles for both server and frontend. Database migrations run automatically on boot. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide.

---

## Contributing

See [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md) for branch naming, commit conventions, PR process, and code standards.

**Quick reference:**

- **Branches**: `feat/<scope>-<description>`, `fix/<scope>-<description>`, `docs/<description>`
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) enforced via Husky + Commitlint
- **PRs**: Fill out the template, link the issue, request review before merge
- **Ledger data is append-only**: never add UPDATE or DELETE paths for `ledger_entries` or `payment_events`

---

## Documentation

| Document | Description |
|---|---|
| [TASK.md](TASK.md) | Full product spec, reconciliation logic, and example flows |
| [CONTRIBUTION_GUIDE.md](CONTRIBUTION_GUIDE.md) | Branch naming, commit conventions, PR process |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Database schema, ER diagram, indexes, append-only policy |
| [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) | Local Docker and Aiven setup, TablePlus guide |
| [docs/REPORTING_VIEWS.md](docs/REPORTING_VIEWS.md) | Reporting views, example queries, API endpoints |
| [docs/openapi.yaml](docs/openapi.yaml) | OpenAPI spec |
| [postman/README.md](postman/README.md) | Postman flows for end-to-end manual testing |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Full-stack Docker production deployment |

---

## License

[Apache License 2.0](LICENSE)

---

*LedgerCore — Nomba × DevCareer Hackathon 2026*
