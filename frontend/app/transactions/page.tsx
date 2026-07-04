'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonCustom } from '@/components/ui/button-custom'
import { Label } from '@/components/ui/label'
import { ListPagination } from '@/components/list-pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useTransactionsQuery } from '@/lib/queries'
import type { BusinessTransaction } from '@/lib/api/types'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'

const STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'matched', label: 'Matched' },
  { value: 'unmatched', label: 'Unmatched' },
] as const

function transactionStatus(transaction: BusinessTransaction): 'matched' | 'unmatched' {
  return transaction.isMatched && transaction.customerId ? 'matched' : 'unmatched'
}

function transactionTitle(transaction: BusinessTransaction): string {
  return (
    transaction.customerName ??
    transaction.senderName ??
    'Unknown sender'
  )
}

function transactionReasoning(transaction: BusinessTransaction): string {
  if (transaction.isMatched && transaction.customerId) {
    return 'Payment reconciled to customer account'
  }
  if (transaction.customerId) {
    return 'Received but not yet reconciled to an obligation'
  }
  return 'Unknown virtual account — customer not found'
}

export default function TransactionsPage() {
  const { activeBusinessId } = useAuth()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const {
    data,
    isLoading,
    isFetching,
    isError,
  } = useTransactionsQuery(activeBusinessId, { page })

  const transactions = data?.items ?? []
  const pagination = data?.pagination

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (statusFilter === 'all') return true
      return transactionStatus(transaction) === statusFilter
    })
  }, [transactions, statusFilter])

  const showInitialLoading =
    !activeBusinessId || (isLoading && transactions.length === 0)

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Review and reconcile payment transactions"
      />

      <div className="px-6 py-6 md:px-8">
        <div className="mb-4">
          <div className="space-y-2">
            <Label htmlFor="transaction-status-filter">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger id="transaction-status-filter" className="w-[180px]">
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
        </div>

        {isFetching && transactions.length > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">Refreshing…</p>
        )}

        {isError && !showInitialLoading && (
          <p className="mb-4 text-sm text-destructive">
            Couldn&apos;t load transactions. Please try again.
          </p>
        )}

        {showInitialLoading ? (
          <p className="text-sm text-muted-foreground">Loading transactions…</p>
        ) : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            {transactions.length === 0
              ? 'No payment events yet. Transactions appear here when Nomba webhooks are received.'
              : 'No transactions match the selected filter on this page.'}
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((transaction) => {
              const status = transactionStatus(transaction)
              const statusVariant =
                status === 'matched' ? 'success' : 'danger'

              return (
                <Card
                  key={transaction.id}
                  className={`p-4 border-l-4 ${
                    status === 'unmatched'
                      ? 'border-l-destructive'
                      : 'border-l-primary'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold">
                          {transactionTitle(transaction)}
                        </p>
                        <Badge variant={statusVariant} size="sm">
                          {status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {transactionReasoning(transaction)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {transaction.id.slice(0, 8)}…
                        {transaction.receivedAt
                          ? ` · ${formatDate(transaction.receivedAt)}`
                          : ''}
                      </p>
                    </div>
                    <div className="ml-6 text-right">
                      <p className="text-lg font-semibold font-mono">
                        {formatCurrency(transaction.amount)}
                      </p>
                      {status === 'unmatched' && (
                        <ButtonCustom
                          variant="primary"
                          size="sm"
                          className="mt-2"
                          disabled
                          title="Manual assignment coming soon"
                        >
                          Assign
                        </ButtonCustom>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

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
