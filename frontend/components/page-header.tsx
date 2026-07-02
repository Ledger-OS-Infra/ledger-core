interface PageHeaderProps {
    title: string
    description?: string
    children?: React.ReactNode
  }
  
  export function PageHeader({ title, description, children }: PageHeaderProps) {
    return (
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            {description && (
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {children && <div className="flex gap-2">{children}</div>}
        </div>
      </div>
    )
  }
  