
'use client'

import { useState } from 'react'
import { MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  error?: string

  disableClipboard?: boolean
}

export function PasswordInput({
  label,
  error,
  disableClipboard,
  className,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  const blockClipboardEvent = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className={cn(
            'w-full px-3 py-2 pr-10 border border-border rounded-sm bg-background text-foreground',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary',
            'transition-colors duration-200',
            error && 'border-destructive focus:ring-destructive focus:border-destructive',
            className
          )}
          onCopy={disableClipboard ? blockClipboardEvent : undefined}
          onPaste={disableClipboard ? blockClipboardEvent : undefined}
          onCut={disableClipboard ? blockClipboardEvent : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <MdVisibilityOff className="w-4 h-4" /> : <MdVisibility className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive font-medium">{error}</p>}
    </div>
  )
}