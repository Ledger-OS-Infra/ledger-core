'use client'

import { type ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
          L
        </div>
      </div>

      {/* Auth Card */}
      <Card className="w-full max-w-sm">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Form Content */}
          {children}
        </div>
      </Card>

      {/* Footer Link */}
      <p className="mt-8 text-xs text-muted-foreground text-center">
        © 2026 Ledger-Core. All rights reserved.
      </p>
    </div>
  )
}
