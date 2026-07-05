'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ListPagination } from '@/components/list-pagination'
import { ButtonCustom } from '@/components/ui/button-custom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddObligationModal } from '@/components/add-obligation-modal'
import { useAuth } from '@/hooks/use-auth'
import { useObligationsQuery } from '@/lib/queries'
import { reportingClient } from '@/lib/api'
import { triggerBlobDownload } from '@/lib/download'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import {
  OBLIGATION_TYPES,
  ObligationStatus,
  obligationStatusVariant,
} from '@/lib/obligations'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: ObligationStatus.UNPAID, label: 'Unpaid' },
  { value: ObligationStatus.PARTIAL, label: 'Partial' },
  { value: ObligationStatus.OVERDUE, label: 'Overdue' },
  { value: ObligationStatus.PAID, label: 'Paid' },
] as const

export default function ObligationsPage() {
  const { activeBusinessId } = useAuth()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  const {
    data,
    isLoading,
    isFetching,
    isError,
  } = useObligationsQuery(activeBusinessId, {
    page,
    status: statusFilter === 'all' ? undefined : statusFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  })

  const obligations = data?.items ?? []
  const pagination = data?.pagination

  const showInitialLoading =
    !activeBusinessId || (isLoading && obligations.length === 0)

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setPage(1)
  }

  const handleExport = async () => {
    if (!activeBusinessId) return
    setIsExporting(true)
    try {
      const blob = await reportingClient.exportObligations(activeBusinessId, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
      })
      const date = new Date().toISOString().slice(0, 10)
      triggerBlobDownload(blob, `obligations-${date}.csv`)
    } catch (err) {
      console.error(err)
      // TODO: surface a toast here if you have a notification system
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Obligations"
        description="View and manage all customer obligations, including paid"
      >
        {activeBusinessId && (
          <AddObligationModal businessId={activeBusinessId} />
        )}
      </PageHeader>

      <div className="px-6 py-6 md:px-8">
        <div className="mb-4 flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger id="status-filter" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-filter">Type</Label>
            <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
              <SelectTrigger id="type-filter" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {OBLIGATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ButtonCustom
            variant="outline"
            className="ml-auto"
            onClick={handleExport}
            disabled={isExporting || !activeBusinessId}
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </ButtonCustom>
        </div>

        {isFetching && obligations.length > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">Refreshing…</p>
        )}

        <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="border-b border-border/70 bg-muted/40">
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Obligation
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Customer
                    </TableHead>
                    <TableHead className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Outstanding
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Due Date
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {showInitialLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-muted-foreground"
                      >
                        Loading obligations…
                      </TableCell>
                    </TableRow>
                  ) : isError && obligations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="px-6 py-10 text-center text-sm text-destructive"
                      >
                        Couldn&apos;t load obligations. Please try again.
                      </TableCell>
                    </TableRow>
                  ) : obligations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="px-6 py-12 text-center text-sm text-muted-foreground"
                      >
                        {statusFilter === 'all' && typeFilter === 'all'
                          ? 'No obligations yet. Create one to start collecting payments.'
                          : 'No obligations match the selected filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    obligations.map((obligation) => (
                      <TableRow
                        key={obligation.obligationId}
                        className="border-b border-border/60 transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="px-6 py-4">
                          <div>
                            <p className="font-medium capitalize">
                              {obligation.obligationType.toLowerCase()}
                            </p>
                            {obligation.referenceCode && (
                              <p className="text-xs text-muted-foreground">
                                {obligation.referenceCode}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Link
                            href={`/customers/${obligation.customerId}`}
                            className="text-sm hover:underline"
                          >
                            {obligation.customerName}
                          </Link>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm">
                          {formatCurrency(obligation.amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm font-medium">
                          {formatCurrency(obligation.outstanding)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {formatDate(obligation.dueDate)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant={obligationStatusVariant(obligation.status)}
                            size="sm"
                            className="rounded-full capitalize"
                          >
                            {obligation.status.toLowerCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {pagination && (
          <ListPagination
            className="mt-4"
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}