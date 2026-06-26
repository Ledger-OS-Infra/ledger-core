#!/usr/bin/env bash
# Create Ledger-Core GitHub issues from TASK.md MVP scope.
# Prerequisites: gh auth login (or gh auth refresh -h github.com)
set -euo pipefail

REPO="${GITHUB_REPO:-Ledger-OS-Infra/ledger--raas}"

create_label() {
  local name="$1"
  local color="$2"
  local description="$3"
  gh label create "$name" --repo "$REPO" --color "$color" --description "$description" 2>/dev/null || true
}

create_issue() {
  local title="$1"
  local labels="$2"
  local body="$3"
  gh issue create --repo "$REPO" --title "$title" --label "$labels" --body "$body"
}

echo "Creating labels..."
create_label "mvp" "0E8A16" "MVP scope"
create_label "stretch" "C5DEF5" "Post-MVP stretch goal"
create_label "database" "5319E7" "PostgreSQL schema and migrations"
create_label "backend" "D93F0B" "Node.js / Express API and services"
create_label "frontend" "FBCA04" "Next.js admin dashboard"
create_label "infra" "1D76DB" "Docker, CI/CD, observability"
create_label "integration" "B60205" "Nomba and external APIs"
create_label "reconciliation" "E99695" "Matching and allocation engine"
create_label "epic" "7057FF" "Parent / foundational work"

echo "Creating issues..."

create_issue \
  "[Epic] Project scaffolding and monorepo setup" \
  "epic,mvp,infra,backend,frontend" \
  "$(cat <<'EOF'
## Summary
Bootstrap the Ledger-Core codebase with a clear monorepo layout, shared tooling, and local dev workflow.

## Requirements
- Monorepo structure: `apps/api` (Express), `apps/web` (Next.js), shared packages as needed
- TypeScript, ESLint, Prettier baseline
- Environment variable templates (`.env.example`) for Nomba, Postgres, Redis
- Root README with setup instructions
- Docker Compose for Postgres + Redis local development

## Acceptance criteria
- [ ] `docker compose up` starts Postgres and Redis
- [ ] API and web apps boot locally with documented env vars
- [ ] Consistent scripts: `dev`, `build`, `lint`, `test` at root

## References
- TASK.md §9 Technical Stack
EOF
)"

create_issue \
  "[DB] Design core PostgreSQL schema" \
  "mvp,database,epic" \
  "$(cat <<'EOF'
## Summary
Design the transactional schema for customers, obligations, payments, ledger, and wallet credits.

## Entities
- **Business** (single-tenant MVP; extensible for multi-business later)
- **Customer** — profile, contact metadata, status
- **VirtualAccount** — Nomba account number, bank details, mapped to customer
- **PaymentObligation** — generic obligation (invoice, subscription/MBU, fee, levy, custom)
  - amount, amount_paid, due_date, status (UNPAID, PARTIAL, PAID, OVERDUE)
  - type, reference_code, metadata (JSON)
- **BillingRule** — recurrence config for auto-generating obligations (e.g. monthly MBU)
- **PaymentEvent** — raw inbound transfer from webhook (idempotency key, amount, sender, timestamp)
- **LedgerEntry** — immutable debit/credit rows (customer_id, obligation_id, payment_event_id, type, amount, balance_after)
- **CustomerWallet** — unallocated / overpayment credit balance

## Acceptance criteria
- [ ] ER diagram or schema doc reviewed by team
- [ ] Indexes on virtual_account lookup, customer obligations, payment idempotency key
- [ ] Ledger entries append-only (no UPDATE/DELETE in application layer)

## References
- TASK.md §4.1 Payment Obligation Model, §5.2 Allocation Rules, §7 Features 1–5
EOF
)"

create_issue \
  "[DB] Implement migrations and seed data" \
  "mvp,database" \
  "$(cat <<'EOF'
## Summary
Implement PostgreSQL migrations (Prisma, Drizzle, or Knex — team choice) and dev seed data.

## Tasks
- [ ] Migration tooling wired to Docker Postgres
- [ ] Initial migration for all core tables
- [ ] Seed script: sample business, 2 customers, invoice + subscription obligations
- [ ] Reporting SQL views stub (see reporting issue)

## Acceptance criteria
- [ ] `migrate` + `seed` runs cleanly on fresh database
- [ ] Seed reproduces invoice and DSTV-style flows from TASK.md §6
EOF
)"

create_issue \
  "[DB] PostgreSQL reporting views for analytics" \
  "mvp,database" \
  "$(cat <<'EOF'
## Summary
Create database views for dashboard and API reporting without heavy application-side aggregation.

## Views
- Customer balance summary (outstanding obligations + wallet credit)
- Obligation aging buckets (current, 30, 60, 90+ days overdue)
- Business metrics: total inflow, total outstanding, overdue count/amount
- Payment history per obligation

## Acceptance criteria
- [ ] Views documented with example queries
- [ ] Used by at least one reporting API endpoint

## References
- TASK.md §7 Feature 6, §9 Reporting Layer
EOF
)"

create_issue \
  "[Backend] Express API scaffolding and middleware" \
  "mvp,backend" \
  "$(cat <<'EOF'
## Summary
Set up the Express + TypeScript API with standard middleware and error handling.

## Tasks
- [ ] Express app with route modules
- [ ] Request validation (Zod or similar)
- [ ] Centralized error handler and structured logging
- [ ] Health check endpoint
- [ ] Postgres connection pool
- [ ] Redis client singleton

## Acceptance criteria
- [ ] API starts and passes health check
- [ ] Validation errors return consistent JSON shape
EOF
)"

create_issue \
  "[Integration] Nomba Virtual Accounts API client" \
  "mvp,backend,integration" \
  "$(cat <<'EOF'
## Summary
Build a typed Nomba API client for virtual account provisioning and configuration.

## Tasks
- [ ] Auth / API key handling from env
- [ ] Create virtual account endpoint wrapper
- [ ] Fetch account details
- [ ] Error mapping and retry for transient failures
- [ ] Unit tests with mocked Nomba responses

## Acceptance criteria
- [ ] Successfully provisions a test virtual account in Nomba sandbox
- [ ] Client reusable from customer creation flow

## References
- TASK.md §7 Feature 1, Nomba Developers docs
EOF
)"

create_issue \
  "[Backend] Customer API and virtual account provisioning" \
  "mvp,backend,integration" \
  "$(cat <<'EOF'
## Summary
Implement customer CRUD and automatic Nomba virtual account mapping.

## Endpoints (suggested)
- `POST /customers` — create profile + provision VA
- `GET /customers`, `GET /customers/:id`
- `PATCH /customers/:id`

## Behaviour
- On create: call Nomba API → persist VirtualAccount linked to customer
- Return VA bank details to caller

## Acceptance criteria
- [ ] Customer creation auto-generates and maps virtual account
- [ ] Lookup by virtual account number works (needed for webhooks)

## References
- TASK.md §7 Feature 1, §6 Step 1
EOF
)"

create_issue \
  "[Backend] Payment Obligation API" \
  "mvp,backend" \
  "$(cat <<'EOF'
## Summary
CRUD API for generic payment obligations (invoice, subscription, fee, levy, custom).

## Fields
- type, amount, due_date, reference_code, metadata, status
- amount_paid, outstanding balance (computed or stored)

## Endpoints (suggested)
- `POST /customers/:id/obligations`
- `GET /customers/:id/obligations`
- `GET /obligations/:id`
- `PATCH /obligations/:id` (limited — no mutating paid ledger history)

## Acceptance criteria
- [ ] Supports invoice and subscription obligation types
- [ ] Status transitions: UNPAID → PARTIAL → PAID
- [ ] Reference code stored for matching cascade

## References
- TASK.md §4.1, §7 Feature 2
EOF
)"

create_issue \
  "[Backend] Billing Rules engine for recurring obligations" \
  "mvp,backend" \
  "$(cat <<'EOF'
## Summary
Auto-generate recurring payment obligations (e.g. monthly MBU on the 1st).

## Tasks
- [ ] BillingRule model: frequency, amount, obligation_type, start date
- [ ] Scheduled job (BullMQ cron) to generate due obligations
- [ ] Idempotent generation (no duplicate MBU for same period)

## Acceptance criteria
- [ ] DSTV-style flow: Jun 1 and Jul 1 obligations auto-created
- [ ] Manual trigger available for testing

## References
- TASK.md §6 Subscription scenario, §7 Feature 2
EOF
)"

create_issue \
  "[Integration] Nomba webhook payment handler" \
  "mvp,backend,integration" \
  "$(cat <<'EOF'
## Summary
Receive, validate, and persist inbound transfer events from Nomba webhooks.

## Tasks
- [ ] `POST /webhooks/nomba` endpoint
- [ ] Signature / payload validation per Nomba docs
- [ ] Persist raw PaymentEvent
- [ ] Resolve customer via virtual account number lookup
- [ ] Enqueue reconciliation job (BullMQ) — do not block webhook response

## Acceptance criteria
- [ ] Valid webhook returns 200 quickly (< 500ms target)
- [ ] Invalid signature rejected
- [ ] Unknown virtual account logged and flagged

## References
- TASK.md §7 Feature 3
EOF
)"

create_issue \
  "[Backend] Redis idempotency layer for payments" \
  "mvp,backend" \
  "$(cat <<'EOF'
## Summary
Prevent duplicate payment processing using Redis-backed idempotency keys.

## Tasks
- [ ] Idempotency key from Nomba transaction/reference ID
- [ ] Check-before-process in webhook handler and reconciliation worker
- [ ] TTL and storage of processed event IDs
- [ ] Flag duplicate payments (optional alert hook)

## Acceptance criteria
- [ ] Same webhook delivered twice results in single ledger effect
- [ ] Duplicate logged with distinguishable status

## References
- TASK.md §5.2 Duplicate payment, §7 Feature 3
EOF
)"

create_issue \
  "[Reconciliation] Core matching engine (exact → reference → FIFO)" \
  "mvp,backend,reconciliation" \
  "$(cat <<'EOF'
## Summary
Implement the hybrid payment matching cascade.

## Matching cascade
1. **Exact amount match** — payment equals one open obligation → match directly
2. **Reference code match** — if payment carries obligation reference
3. **FIFO fallback** — oldest outstanding obligation first

## Acceptance criteria
- [ ] Unit tests for each strategy in isolation
- [ ] Integration test: invoice exact match bypasses FIFO
- [ ] Integration test: no exact match falls through to FIFO

## References
- TASK.md §5.1, §7 Feature 4
EOF
)"

create_issue \
  "[Reconciliation] Payment allocation logic" \
  "mvp,backend,reconciliation" \
  "$(cat <<'EOF'
## Summary
Apply matched payments with full, partial, overpayment, and multi-obligation FIFO allocation.

## Scenarios
| Scenario | Behaviour |
|----------|-----------|
| Full payment | Obligation PAID, ledger entry |
| Partial | Obligation PARTIAL, balance updated |
| Overpayment | Obligation PAID, excess → customer wallet |
| Multiple obligations | FIFO across open obligations |
| Unmatched | Unallocated credit, flag for review |

## Acceptance criteria
- [ ] Reproduces TASK.md §6 invoice flow (₦70k partial, ₦100k with ₦20k wallet)
- [ ] Reproduces subscription flow (₦4,400 partial, ₦7,600 clearing two MBUs)
- [ ] All transitions atomic (DB transaction)

## References
- TASK.md §5.2, §6
EOF
)"

create_issue \
  "[Backend] Immutable ledger writer service" \
  "mvp,backend,reconciliation" \
  "$(cat <<'EOF'
## Summary
Write append-only debit/credit ledger entries as the financial source of truth.

## Tasks
- [ ] LedgerEntry creation on every allocation event
- [ ] Entry types: PAYMENT_APPLIED, PARTIAL_PAYMENT, OVERPAYMENT_CREDIT, WALLET_APPLIED
- [ ] balance_after snapshot per customer
- [ ] Query API: customer ledger history

## Acceptance criteria
- [ ] No update/delete paths for ledger rows
- [ ] Full audit trail per customer retrievable via API

## References
- TASK.md §7 Feature 5
EOF
)"

create_issue \
  "[Backend] BullMQ async reconciliation worker" \
  "mvp,backend,infra" \
  "$(cat <<'EOF'
## Summary
Process reconciliation jobs reliably off the webhook hot path.

## Tasks
- [ ] BullMQ queue + worker setup with Redis
- [ ] Job: process PaymentEvent → matching → allocation → ledger
- [ ] Retry with backoff on transient DB errors
- [ ] Dead-letter / failed job visibility

## Acceptance criteria
- [ ] Webhook enqueues job; worker completes end-to-end reconciliation
- [ ] Failed jobs retry and surface in logs/monitoring
EOF
)"

create_issue \
  "[Backend] Reporting and analytics API" \
  "mvp,backend,database" \
  "$(cat <<'EOF'
## Summary
REST endpoints powering the admin dashboard and external consumers.

## Endpoints (suggested)
- Customer view: balance, ledger history, outstanding obligations
- Obligation view: status, payment history, aging
- Business view: total inflow, outstanding, overdue summary
- Aging report: 30 / 60 / 90 day buckets

## Acceptance criteria
- [ ] Endpoints backed by reporting views where appropriate
- [ ] Pagination on list endpoints
- [ ] OpenAPI or route documentation

## References
- TASK.md §7 Feature 6
EOF
)"

create_issue \
  "[Frontend] Next.js admin dashboard scaffolding" \
  "mvp,frontend" \
  "$(cat <<'EOF'
## Summary
Bootstrap the Next.js + Tailwind admin app with layout and API client.

## Tasks
- [ ] Next.js App Router setup with Tailwind CSS
- [ ] App shell: sidebar nav, header, responsive layout
- [ ] React Query provider and typed API client
- [ ] Route structure: dashboard, customers, obligations, reports

## Acceptance criteria
- [ ] App runs locally against API
- [ ] Shared layout and navigation in place
EOF
)"

create_issue \
  "[Frontend] Customer management UI" \
  "mvp,frontend" \
  "$(cat <<'EOF'
## Summary
UI to create and view customers with their virtual account details.

## Screens
- Customer list with search/filter
- Customer detail: profile, VA bank details, wallet balance
- Create customer form

## Acceptance criteria
- [ ] Create customer triggers VA provisioning via API
- [ ] VA details visible on customer detail page
EOF
)"

create_issue \
  "[Frontend] Payment obligations UI" \
  "mvp,frontend" \
  "$(cat <<'EOF'
## Summary
Create and manage payment obligations per customer.

## Screens
- Obligation list (filter by status, type, overdue)
- Create obligation form (type, amount, due date, reference)
- Obligation detail: status, payment history, amount paid vs outstanding

## Acceptance criteria
- [ ] Supports invoice and subscription types
- [ ] Status badges: UNPAID, PARTIAL, PAID, OVERDUE
EOF
)"

create_issue \
  "[Frontend] Business dashboard and aging reports" \
  "mvp,frontend" \
  "$(cat <<'EOF'
## Summary
Business-level reporting views for finance ops.

## Screens
- Dashboard: total inflow, outstanding, overdue counts
- Aging report table: 30 / 60 / 90 day buckets
- Recent payments / unmatched payments alert section

## Acceptance criteria
- [ ] Data from reporting API with React Query caching
- [ ] Aging buckets match DB view calculations
EOF
)"

create_issue \
  "[Infra] Docker production compose and deployment config" \
  "mvp,infra" \
  "$(cat <<'EOF'
## Summary
Containerize API, web, Postgres, and Redis for deployable environments.

## Tasks
- [ ] Multi-stage Dockerfiles for API and web
- [ ] Production-oriented compose or deployment manifest
- [ ] Env/secrets documentation
- [ ] Migration run on deploy

## Acceptance criteria
- [ ] Full stack runs via Docker
- [ ] Documented deploy steps for hackathon demo
EOF
)"

create_issue \
  "[Infra] GitHub Actions CI/CD pipeline" \
  "mvp,infra" \
  "$(cat <<'EOF'
## Summary
Automated lint, test, and build on pull requests.

## Tasks
- [ ] CI workflow: install, lint, typecheck, test
- [ ] Build Docker images on main (optional push to registry)
- [ ] PR checks required before merge

## Acceptance criteria
- [ ] CI runs on every PR
- [ ] Failing tests block merge
EOF
)"

create_issue \
  "[Infra] Sentry error tracking and monitoring" \
  "mvp,infra,backend,frontend" \
  "$(cat <<'EOF'
## Summary
Integrate Sentry for API and frontend error tracking.

## Tasks
- [ ] Sentry SDK in Express API
- [ ] Sentry SDK in Next.js
- [ ] Source maps upload (optional)
- [ ] Tag errors with customer/payment context where safe (no PII leaks)

## Acceptance criteria
- [ ] Test error appears in Sentry dashboard
- [ ] Webhook and reconciliation failures captured
EOF
)"

# --- Stretch goals ---

create_issue \
  "[Stretch] Smart reconciliation rules UI" \
  "stretch,frontend,backend,reconciliation" \
  "$(cat <<'EOF'
Allow businesses to configure matching preferences (e.g. FIFO-only vs exact-first, reference required).

Ref: TASK.md §8
EOF
)"

create_issue \
  "[Stretch] Dunning engine (SMS/email reminders)" \
  "stretch,backend" \
  "$(cat <<'EOF'
Auto-reminders for overdue obligations via SMS/email integrations.

Ref: TASK.md §8
EOF
)"

create_issue \
  "[Stretch] Customer self-service portal" \
  "stretch,frontend" \
  "$(cat <<'EOF'
Customer-facing portal: view balance, outstanding obligations, download statement.

Ref: TASK.md §8
EOF
)"

create_issue \
  "[Stretch] CSV export and accounting integrations" \
  "stretch,backend,frontend" \
  "$(cat <<'EOF'
Export ledger and obligation data to CSV; groundwork for accounting system connectors.

Ref: TASK.md §8
EOF
)"

create_issue \
  "[Stretch] Multi-business SaaS mode" \
  "stretch,database,backend" \
  "$(cat <<'EOF'
Support multiple businesses on one Ledger-Core instance with tenant isolation.

Ref: TASK.md §8
EOF
)"

create_issue \
  "[Stretch] AI assistant for finance queries" \
  "stretch,backend,frontend" \
  "$(cat <<'EOF'
Natural-language queries over ledger and obligation data (e.g. \"who is overdue this month?\").

Ref: TASK.md §8
EOF
)"

echo "Done. Created issues in $REPO"
