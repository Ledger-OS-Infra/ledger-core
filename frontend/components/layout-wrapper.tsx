'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Full-screen, sidebar-less routes: auth pages and first-run onboarding
  // (the user has no workspace yet, so the sidebar has nothing to show).
  const isFullScreen =
    pathname.startsWith('/auth') || pathname === '/onboarding'

  if (isFullScreen) {
    return (
      <div className="flex h-screen items-center justify-center w-full">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
