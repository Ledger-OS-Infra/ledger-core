import { cn } from '@/lib/utils'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function FormInput({ label, error, className, ...props }: FormInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2 border border-border rounded-sm bg-background text-foreground',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary',
          'transition-colors duration-200',
          error && 'border-destructive focus:ring-destructive focus:border-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  )
}
