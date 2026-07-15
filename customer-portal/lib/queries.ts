import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  downloadStatement,
  fetchAccount,
  fetchHistory,
  forgotPassword,
  getPortalToken,
  loginCustomer,
  resetPassword,
  setPortalToken,
} from "@/lib/api";

export const portalKeys = {
  account: ["portal", "account"] as const,
  history: ["portal", "history"] as const,
};

export function useAccountQuery() {
  return useQuery({
    queryKey: portalKeys.account,
    queryFn: async () => (await fetchAccount()).data,
    enabled: Boolean(getPortalToken()),
  });
}

export function useHistoryQuery() {
  return useQuery({
    queryKey: portalKeys.history,
    queryFn: async () => (await fetchHistory()).data.entries,
    enabled: Boolean(getPortalToken()),
  });
}

// ── Login (email + password → session token) ──────────────────────────

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginCustomer(email, password),
    onSuccess: ({ data }) => {
      setPortalToken(data.token);
      queryClient.removeQueries({ queryKey: portalKeys.account });
      queryClient.removeQueries({ queryKey: portalKeys.history });
    },
  });
}

// ── Forgot / reset password ────────────────────────────────────────────

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (email: string) => forgotPassword(email),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      resetPassword(token, password),
  });
}

// ── Statement download ───────────────────────────────────────────────

export function useDownloadStatementMutation() {
  return useMutation({
    mutationFn: downloadStatement,
  });
}