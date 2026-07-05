"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "@/hooks/use-auth"

const FIVE_MINUTES = 5 * 60 * 1_000
const TEN_MINUTES = 10 * 60 * 1_000

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 5 min — navigating back won't refetch.
            staleTime: FIVE_MINUTES,
            // Keep unused cache for 10 min after leaving a page.
            gcTime: TEN_MINUTES,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
