# Ledger-Core Customer Portal

A standalone, mobile-first customer self-service portal, wired to the real
Ledger-Core API — no mock data. Built with Next.js (App Router), Tailwind
v4, and Radix UI primitives (Avatar, Separator, Slot).

## Setup

```bash
cp .env.local.example .env.local   # point at your API server
npm install
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:3050` if unset.

## Server-side requirements

This frontend expects the following endpoints on the API server (see the
integration notes shared alongside this project for the full route code):

- `POST /portal/lookup` — `{ account_number, email }` → `{ data: { token } }`
- `GET /portal/account` — Bearer `token` → balance, obligations, recent ledger
- `GET /portal/history` — Bearer `token` → full ledger
- `GET /portal/statement.pdf` — Bearer `token` → PDF stream

If your API runs on a different origin than the frontend, make sure that
origin is added to the server's CORS allow-list (`FRONTEND_URL` / the
`corsOrigins` set in `app.ts`).

## Structure

```
app/
  page.tsx                 Page 1 — lookup (/), calls POST /portal/lookup
  account/
    page.tsx                 Page 2 — account overview, calls GET /portal/account
    history/
      page.tsx                 Page 3 — full statement, calls GET /portal/history
components/
  portal-header.tsx         Sticky header (business name + initials passed as props)
  balance-card.tsx           Balance hero + zero-balance "caught up" state
  obligation-card.tsx        "What you owe" card with copy-account-number action
  ledger-row.tsx              Single payment/obligation row
  status-pill.tsx              Paid / Partial / Unpaid pill
  theme-toggle.tsx              Toggles .dark on <html>, persists to localStorage
  download-statement-button.tsx  Fetches /portal/statement.pdf and triggers a download
  ui/                            button.tsx, card.tsx, avatar.tsx, separator.tsx
lib/
  api.ts                      All server calls + portal session token storage
  format.ts                    Naira + date formatting helpers (tabular-nums)
  utils.ts                      cn() class merge helper
```

## Session handling

- The lookup page exchanges `{ account_number, email }` for a short-lived
  portal token, stored in `sessionStorage` (`ledger-core-portal-token`) —
  intentionally not `localStorage`, so it clears when the tab closes.
- `/account` and `/account/history` are client components: on mount they
  check for a token and redirect to `/` if missing, and clear the token +
  redirect on a 401 (expired/invalid session) from the API.
- The statement download hits `/portal/statement.pdf` directly and saves
  the response as a file — no PDF is generated in the browser.
