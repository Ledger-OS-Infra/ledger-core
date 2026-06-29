# Ledger-Core
## Universal Reconciliation Engine
Built on Nomba Virtual Accounts | Nomba x DevCareer Hackathon 2026
"Every bank transfer becomes a structured financial event — not just a notification."
## 1. Executive Summary
Ledger-Core is a universal reconciliation engine that sits on top of Nomba Virtual Accounts. It automatically captures inbound transfers, matches them to any expected payment obligation — invoices, subscriptions or custom payment types — and maintains a complete, immutable customer-level ledger in real time.
The core insight driving Ledger-Core is simple: virtual accounts solve the problem of receiving money. Ledger-Core solves the harder problem of understanding what that money means, and what to do with it.
## 2. The Problem
Businesses collecting payments via bank transfer face a consistent set of downstream problems, regardless of their industry:
* Manual reconciliation of incoming payments against expected amounts
* Confusion and data loss around partial payments and overpayments
* Inability to handle multiple outstanding obligations per customer
* Spreadsheet-based accounting that breaks at scale 

Even with Nomba Virtual Accounts, money arriving does not equal money understood. A transfer notification tells a business that ₦4,400 arrived — it does not tell the business:

* Which customer sent it

* Which obligation it should apply to

* Whether it is a full, partial, or overpayment
* What the customer's outstanding balance is after applying it
Ledger-Core fills this gap — automatically, in real time, for any business type.
## 3. The Solution
Ledger-Core is a reconciliation infrastructure layer that:
1. 	Assigns each customer a unique Nomba Virtual Account
2. 	Captures all inbound transfers automatically via webhooks
3. 	Matches every payment to the correct customer and obligation
4. 	Applies smart allocation logic — full, partial, overpayment, FIFO, or exact match
5. 	Maintains an immutable double-entry-style customer ledger
6. Exposes real-time dashboards and APIs for business reporting
## 4. What Makes It Universal
Existing products/infrastructures in this scope are limited to invoice-based businesses. Ledger-Core introduces a generic Payment Obligation model that fundamentally changes the product's scope.
### 4.1 The Payment Obligation Model
Instead of matching payments to invoices only, Ledger-Core matches payments to any Payment Obligation — a generic record representing any expected payment from a customer to a business.
### 4.2 Supported Business Types
 

| Business Type | Obligation Type 
| :---          | :---         |
| B2B / Freelance  | Invoice |
|Subscription / Utilities /SaaS | Subscription (MBU) DSTV subscriber owes ₦6,000 monthly |


**Example Use Case** :
Client owes ₦150,000 for a project
Subscription / Utilities / SaaS
Subscription (MBU)
DSTV subscriber owes ₦6,000 monthly

## 5. Reconciliation Engine — Core Logic
5.1 Payment Matching Strategy (Hybrid)
When a payment arrives, the engine applies a three-step matching cascade:
|Strategy | How It Works |
| :---          | :---         
|Exact Amount Match | If payment amount exactly equals one open obligation, match it directly regardless of age|
|FIFO Fallback | If no exact match or reference code, apply payment to oldest outstanding obligation first |

 
***This hybrid approach covers the majority of real-world scenarios. Exact matching handles clean payments. FIFO handles everything else safely.***
### 5.2 Allocation Rules
 
| Scenario | Engine Behaviour
| :--  | :--
| Full payment | Obligation marked PAID, ledger entry written
| Partial payment | Obligation marked PARTIAL, balance updated, outstanding tracked
| Overpayment | Obligation marked PAID, excess credited to customer wallet for future obligations
| Multiple obligations (FIFO) | Oldest obligation cleared first, remainder applied to next
| Exact amount match | Engine bypasses FIFO and matches the specific obligation directly
| Duplicate payment | Idempotency check flags and ignores; optionally alerts business
| Unmatched payment | Stored as unallocated credit, flagged for manual review or auto-applied to next obligation

 
## 6. Full Example Flow
### Scenario: Invoice-Based Business
 
| Step | Event | System Action | State
| :-- | :--| :-- | :--|
| 1 | Customer John Doe created | Virtual account 811234XXXX auto-generated and mapped | Account active
| 2 | Invoice created: ₦150,000 | Payment Obligation record created, status = UNPAID | ₦150,000 outstanding
| 3 | John pays ₦70,000 | Webhook fires → customer resolved → partial match → ledger written | ₦80,000 outstanding
| 4 | John pays ₦100,000 | ₦80,000 clears invoice → ₦20,000 excess credited to wallet | Invoice PAID, ₦20,000 credit

 
### Scenario: Subscription Business (DSTV-style)
Alice owes ₦6,000 on the 1st of every month. 
| Date| Event| System Action| Balance |
| :-- | :-- | :-- | :-- |
Jun 1 | MBU auto-generated | Obligation created: ₦6,000 due | ₦6,000 outstanding
Jun 10 | Alice pays ₦4,400 | Partial match to June MBU | ₦1,600 outstanding
Jul 1 | New MBU auto-generated | July obligation created: ₦6,000 due | ₦7,600 total outstanding
Jul 5 | Alice pays ₦7,600 | Clears June balance + July MBU in full | ₦0 outstanding

 
 
## 7. Core Features — MVP
### Feature 1: Customer Virtual Accounts
* Create customer profile
* Auto-generate Nomba Virtual Account via API
* Map virtual account to customer ID
 
### Feature 2: Payment Obligation System
* Create any obligation type — invoice, subscription, fee, levy, custom
* Support amount, due date, recurrence, status, and metadata
* Auto-generate recurring obligations via Billing Rules engine
 
### Feature 3: Webhook Payment Handler
* Receive and validate incoming transfer events from Nomba
* Idempotency check prevents double-processing
•       Customer resolution via virtual account lookup
 
### Feature 4: Reconciliation Engine (Core Value)
* Hybrid matching: exact amount → reference code → FIFO fallback
* Full, partial, overpayment, and unmatched payment handling
* Multi-obligation FIFO allocation
* Duplicate payment detection and flagging
 
### Feature 5: Ledger System
* Immutable debit/credit entries — source of truth
* Full audit trail per customer
 
### Feature 6: Reporting Dashboard
* Customer view: balance, history, outstanding obligations
* Obligation view: status, payment history, aging
* Business view: total inflow, total outstanding, overdue
* Aging report: 30 / 60 / 90 days overdue
## 8. Stretch Goals
* Smart reconciliation rules UI — business configures their own matching preferences
* Dunning engine — auto-reminders for overdue obligations via SMS/email
* Customer self-service portal — view balance, download statement
* Export to CSV and accounting systems
* Multi-business / SaaS mode — multiple businesses on one Ledger-Core instance
* AI assistant for finance queries
 
## 9. Technical Stack
Ledger-Core will be built using:
Backend: Node.js (TypeScript) with Express for the reconciliation engine
* Database: PostgreSQL for transactional ledger and obligation storage
Cache & Coordination: Redis for caching, idempotency, and job coordination
* Financial Integration: Nomba Virtual Accounts and Webhooks APIs for real-time payment ingestion
* Async Processing: BullMQ for reliable reconciliation job workflows
* Frontend: Next.js with Tailwind CSS for the admin dashboard
* Data Fetching: React Query for client-state and API synchronization
* Reporting Layer: PostgreSQL-driven reporting views for real-time analytics
* Deployment: Docker with CI/CD via GitHub Actions
Observability: Sentry for error tracking and monitoring

 ----
 
*Ledger-Core — Nomba x DevCareer Hackathon 2026*

