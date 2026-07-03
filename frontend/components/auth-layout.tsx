'use client'

import { type ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { useTheme } from '@/hooks/use-theme'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme()
  const resolvedTheme = theme ?? 'light'
  const logoSrc = resolvedTheme === 'dark' ? '/ledger_core_L_white_64.png' : '/ledger_core_L_dark_text_64.png'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <Image src={logoSrc} alt="Logo" width={50} height={50} className="mb-8" />

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
