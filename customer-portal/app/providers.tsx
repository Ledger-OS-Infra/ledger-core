"use client";

import * as React from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { ApiError, clearPortalToken } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (not per render) — created lazily
  // via useState so it survives re-renders but isn't shared across users
  // on the server. A global QueryCache handler deals with expired-session
  // (401) errors from any query, so individual pages/hooks don't each need
  // their own error-handling effect.
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status === 401) {
              clearPortalToken();
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
