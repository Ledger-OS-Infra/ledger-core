interface StatBlockProps {
    label: string
    value: string | number
    description?: string
  }
  
  export function StatBlock({ label, value, description }: StatBlockProps) {
    return (
      <div className="border border-border rounded bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold font-mono">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    )
  }
  