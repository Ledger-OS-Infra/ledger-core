import { ButtonCustom } from '@/components/ui/button-custom'
import type { PaginationMeta } from '@/lib/api/types'

interface ListPaginationProps {
  pagination: PaginationMeta
  onPageChange: (page: number) => void
  className?: string
}

export function ListPagination({
  pagination,
  onPageChange,
  className,
}: ListPaginationProps) {
  const { page, totalPages, total, limit } = pagination

  if (totalPages <= 1) return null

  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div
      className={`flex items-center justify-between gap-4 text-sm ${className ?? ''}`}
    >
      <p className="text-muted-foreground">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <ButtonCustom
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </ButtonCustom>
        <span className="text-muted-foreground tabular-nums">
          Page {page} of {totalPages}
        </span>
        <ButtonCustom
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </ButtonCustom>
      </div>
    </div>
  )
}
