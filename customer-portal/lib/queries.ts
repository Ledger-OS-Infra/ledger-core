import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  downloadStatement,
  fetchAccount,
  fetchHistory,
  getPortalToken,
  lookupAccount,
  setPortalToken,
} from "@/lib/api";

// ── Query keys ──────────────────────────────────────────────────────────

export const portalKeys = {
  account: ["portal", "account"] as const,
  history: ["portal", "history"] as const,
};

// ── Account overview ─────────────────────────────────────────────────

export function useAccountQuery() {
  return useQuery({
    queryKey: portalKeys.account,
    queryFn: async () => (await fetchAccount()).data,
    // No point calling the API if there's no session token yet — the
    // page will redirect to the lookup screen in that case.
    enabled: Boolean(getPortalToken()),
  });
}

// ── Full ledger history ──────────────────────────────────────────────

export function useHistoryQuery() {
  return useQuery({
    queryKey: portalKeys.history,
    queryFn: async () => (await fetchHistory()).data.entries,
    enabled: Boolean(getPortalToken()),
  });
}

// ── Lookup (account number + email → session token) ─────────────────

export function useLookupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountNumber,
      email,
    }: {
      accountNumber: string;
      email: string;
    }) => lookupAccount(accountNumber, email),
    onSuccess: ({ data }) => {
      setPortalToken(data.token);
      // Drop any stale account/history data from a previous session.
      queryClient.removeQueries({ queryKey: portalKeys.account });
      queryClient.removeQueries({ queryKey: portalKeys.history });
    },
  });
}

// ── Statement download ───────────────────────────────────────────────

export function useDownloadStatementMutation() {
  return useMutation({
    mutationFn: downloadStatement,
  });
}
