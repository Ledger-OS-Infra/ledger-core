# Reporting views

PostgreSQL views for dashboard and API reporting. Amounts are **kobo** integers (1 NGN = 100 kobo).

**Migrations:** `20260627100001_reporting_views.ts`, `20260627100002_update_reporting_views.ts`, `20260630100000_reporting_detail_views.ts`  
**API:** `GET /reporting/*` (see [API endpoints](#api-endpoints))  
**OpenAPI:** [`docs/openapi.yaml`](./openapi.yaml)

---

## Views

### `v_customer_balance_summary`

Outstanding open obligations and wallet credit per customer.

| Column              | Description                                      |
|---------------------|--------------------------------------------------|
| `total_outstanding` | Sum of open obligation balances                  |
| `wallet_credit`     | Unallocated / overpayment credit                 |
| `net_balance`       | `total_outstanding - wallet_credit`              |

**Example query**

```sql
SELECT full_name, total_outstanding, wallet_credit, net_balance
FROM v_customer_balance_summary
WHERE business_id = '11111111-1111-1111-1111-111111111101'
ORDER BY full_name;
```

---

### `v_obligation_aging`

Open obligations with days overdue and aging bucket.

| `aging_bucket` | Meaning                          |
|----------------|----------------------------------|
| `current`      | Not yet due                      |
| `1_30_days`    | 1–30 days overdue                |
| `31_60_days`   | 31–60 days overdue               |
| `61_90_days`   | 61–90 days overdue               |
| `90_plus_days` | More than 90 days overdue        |
| `paid`         | Excluded from view (PAID only)   |

**Example query — overdue obligations**

```sql
SELECT customer_name, reference_code, outstanding, days_overdue, aging_bucket
FROM v_obligation_aging
WHERE business_id = '11111111-1111-1111-1111-111111111101'
  AND aging_bucket != 'current'
ORDER BY days_overdue DESC;
```

---

### `v_obligation_aging_summary`

Aggregated counts and amounts per aging bucket (built on `v_obligation_aging`).

**Example query — dashboard buckets**

```sql
SELECT aging_bucket, obligation_count, total_outstanding
FROM v_obligation_aging_summary
WHERE business_id = '11111111-1111-1111-1111-111111111101'
ORDER BY aging_bucket;
```

---

### `v_business_metrics`

Business-level totals: inflow, outstanding, overdue, wallet credit.

**Example query**

```sql
SELECT
  business_name,
  total_inflow,
  total_outstanding,
  overdue_obligation_count,
  overdue_amount,
  total_wallet_credit
FROM v_business_metrics
WHERE business_id = '11111111-1111-1111-1111-111111111101';
```

---

### `v_obligation_payment_history`

Ledger allocations linked to payment events for each obligation. Order results in queries with `ORDER BY allocated_at`.

**Example query — invoice payment trail**

```sql
SELECT
  reference_code,
  allocation_amount,
  balance_after,
  description,
  allocated_at,
  payment_amount,
  sender_name
FROM v_obligation_payment_history
WHERE obligation_id = '<obligationId from Postman>'
ORDER BY allocated_at;
```

---

### `v_customer_ledger_history`

Ledger entries per customer with linked obligation and payment event details.

---

### `v_obligation_detail`

All obligations (any status) with aging bucket and outstanding balance.

---

## API endpoints

Base URL: `http://localhost:3050` (see `PORT` in `server/.env`).

All list endpoints support `?page=1&limit=20` (max `limit=100`).

| Method | Path | View(s) used |
|--------|------|--------------|
| `GET` | `/reporting/business/:businessId/metrics` | `v_business_metrics` |
| `GET` | `/reporting/business/:businessId/customers` | `v_customer_balance_summary` |
| `GET` | `/reporting/business/:businessId/aging` | `v_obligation_aging`, `v_obligation_aging_summary` |
| `GET` | `/reporting/customers/:customerId` | `v_customer_balance_summary` |
| `GET` | `/reporting/customers/:customerId/obligations` | `v_obligation_aging` |
| `GET` | `/reporting/customers/:customerId/ledger` | `v_customer_ledger_history` |
| `GET` | `/reporting/obligations/:obligationId` | `v_obligation_detail` |
| `GET` | `/reporting/obligations/:obligationId/payments` | `v_obligation_payment_history` |

### Pagination response shape

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0
  }
}
```

The aging endpoint nests paginated obligations inside `data.obligations` and returns `data.summary` for bucket totals.

**Example — business metrics (after Postman bootstrap)**

```bash
curl http://localhost:3050/reporting/business/11111111-1111-1111-1111-111111111101/metrics
```

**Example response**

```json
{
  "data": {
    "business_id": "11111111-1111-1111-1111-111111111101",
    "business_name": "Ledger-Core Demo Business",
    "total_inflow": "182000",
    "total_outstanding": "0",
    "overdue_obligation_count": 0,
    "overdue_amount": "0",
    "total_wallet_credit": "20000"
  }
}
```

---

## Postman testing

Use env vars from the Postman flows (`businessId`, `customerId`, `obligationId`) — see [`postman/README.md`](../postman/README.md). No seed data required.

---

## References

- TASK.md §7 Feature 6 — Reporting Dashboard
- TASK.md §9 — Reporting Layer
- [`docs/SCHEMA.md`](./SCHEMA.md) — entity design
