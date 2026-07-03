
import { cn } from '@/lib/utils'

interface StrengthResult {
  label: 'Weak' | 'Medium' | 'Strong'
  score: number 
}

export function getPasswordStrength(password: string): StrengthResult {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { label: 'Weak', score }
  if (score <= 3) return { label: 'Medium', score }
  return { label: 'Strong', score }
}

const STRENGTH_STYLES: Record<StrengthResult['label'], string> = {
  Weak: 'bg-destructive',
  Medium: 'bg-yellow-500',
  Strong: 'bg-green-500',
}

const STRENGTH_TEXT_STYLES: Record<StrengthResult['label'], string> = {
  Weak: 'text-destructive',
  Medium: 'text-yellow-600 dark:text-yellow-500',
  Strong: 'text-green-600 dark:text-green-400',
}

interface PasswordStrengthMeterProps {
  password: string
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null

  const { label, score } = getPasswordStrength(password)
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password)

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full bg-secondary transition-colors duration-200',
              i < score && STRENGTH_STYLES[label]
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', STRENGTH_TEXT_STYLES[label])}>
        {label} password
        {!hasSpecialChar && label !== 'Strong' && (
          <span className="text-muted-foreground font-normal">
            {' '}
            — add a special character to strengthen it
          </span>
        )}
      </p>
    </div>
  )
}