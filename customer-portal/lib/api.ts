const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3050";

const TOKEN_KEY = "ledger-core-portal-token";

export function getPortalToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setPortalToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearPortalToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getPortalToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      body?.error?.message ?? "Something went wrong. Please try again.",
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

// ── Lookup ────────────────────────────────────────────────────────────

export async function lookupAccount(accountNumber: string, email: string) {
  return request<{ data: { token: string; expires_in: string } }>(
    "/portal/lookup",
    {
      method: "POST",
      body: JSON.stringify({ account_number: accountNumber, email }),
    },
  );
}

// ── Account overview ─────────────────────────────────────────────────

export type ObligationStatus = "paid" | "partial" | "unpaid";

export interface PortalObligation {
  id: string;
  name: string;
  amount: number;
  remaining: number;
  status: ObligationStatus;
  due_date: string;
}

export type LedgerEntryKind = "payment" | "obligation";

export interface PortalLedgerEntry {
  id: string;
  date: string;
  kind: LedgerEntryKind;
  description: string;
  amount: number;
  applied_to: string | null;
}

export interface PortalAccount {
  business: { name: string };
  customer: {
    id: string;
    name: string;
    virtual_account: string;
    initials: string;
  };
  balance: { outstanding: number; wallet_credit: number };
  obligations: PortalObligation[];
  recent_ledger: PortalLedgerEntry[];
}

export async function fetchAccount() {
  return request<{ data: PortalAccount }>("/portal/account");
}

export async function fetchHistory() {
  return request<{ data: { entries: PortalLedgerEntry[] } }>(
    "/portal/history",
  );
}

// ── Statement download ───────────────────────────────────────────────

export async function downloadStatement(): Promise<void> {
  const token = getPortalToken();

  const res = await fetch(`${API_BASE_URL}/portal/statement.pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new ApiError(
      "Couldn't generate your statement. Please try again.",
      res.status,
    );
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "statement.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
