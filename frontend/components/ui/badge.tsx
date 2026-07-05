import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded font-medium', {
  variants: {
    variant: {
      default: 'bg-muted text-foreground',
      success: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
      danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
    },
    size: {
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-1.5 text-sm',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'sm',
  },
})

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode
}

export function Badge({ children, variant, size, className, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {children}
    </span>
  )
}
