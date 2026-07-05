'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatBlock } from '@/components/stat-block'
import { useCustomerDetailQuery } from '@/lib/queries'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { isLedgerCreditEntry } from '@/lib/ledger'
import Link from 'next/link'
import { MdArrowBack, MdCheckCircle, MdContentCopy } from 'react-icons/md'

function VirtualAccountCopy({
  accountNumber,
  bankName,
}: {
  accountNumber: string
  bankName: string
}) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopied(true)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard denied — no-op.
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground font-mono">{accountNumber}</span>
      <span className="text-xs text-muted-foreground">{bankName}</span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy account number'}
        aria-label={copied ? 'Copied' : 'Copy account number'}
        className={`rounded p-0.5 transition-colors ${
          copied
            ? 'text-green-600 dark:text-green-400'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {copied ? (
          <MdCheckCircle className="h-3.5 w-3.5" />
        ) : (
          <MdContentCopy className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  )
}

function obligationStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
  switch (status.toUpperCase()) {
    case 'PAID':
      return 'success'
    case 'PARTIAL':
      return 'warning'
    case 'OVERDUE':
      return 'danger'
    default:
      return 'default'
  }
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data, isLoading, isFetching, isError } = useCustomerDetailQuery(id)

  if (isLoading && !data) {
    return (
      <div className="p-8 mx-auto">
        <Link
          href="/customers"
          className="flex items-center gap-2 text-sm text-primary hover:underline mb-6"
        >
          <MdArrowBack className="h-4 w-4" />
          Back to Customers
        </Link>
        <p className="text-muted-foreground">Loading customer…</p>
      </div>
    )
  }

  if (isError && !data) {
    return (
      <div className="p-8  mx-auto">
        <Link
          href="/customers"
          className="flex items-center gap-2 text-sm text-primary hover:underline mb-4"
        >
          <MdArrowBack className="h-4 w-4" />
          Back to Customers
        </Link>
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    )
  }

  const { record, balance, obligations, ledger } = data!

  return (
    <div className="p-8  mx-auto">
      <Link
        href="/customers"
        className="flex items-center gap-2 text-sm text-primary hover:underline mb-6"
      >
        <MdArrowBack className="h-4 w-4" />
        Back to Customers
      </Link>

      {isFetching && (
        <p className="mb-4 text-xs text-muted-foreground">Refreshing…</p>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <Avatar name={record.full_name} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{record.full_name}</h1>
          <p className="text-muted-foreground mt-1">{record.email ?? '—'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={record.status === 'ACTIVE' ? 'success' : 'danger'}>
              {record.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
            <VirtualAccountCopy
              accountNumber={record.virtual_account.account_number}
              bankName={record.virtual_account.bank_name}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatBlock
          label="Outstanding"
          value={formatCurrency(balance.totalOutstanding)}
        />
        <StatBlock
          label="Wallet Credit"
          value={formatCurrency(balance.walletCredit)}
        />
        <StatBlock
          label="Net Balance"
          value={formatCurrency(balance.netBalance)}
        />
      </div>

      {/* Obligations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Outstanding Obligations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {obligations.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No outstanding obligations
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-xs uppercase text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right font-semibold text-xs uppercase text-muted-foreground">
                      Outstanding
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((obligation) => (
                    <tr
                      key={obligation.obligationId}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium capitalize">
                          {obligation.obligationType.toLowerCase()}
                        </p>
                        {obligation.referenceCode && (
                          <p className="text-xs text-muted-foreground">
                            {obligation.referenceCode}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {formatCurrency(obligation.amount)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {formatCurrency(obligation.outstanding)}
                      </td>
                      <td className="px-6 py-4">{formatDate(obligation.dueDate)}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={obligationStatusVariant(obligation.status)}
                          size="sm"
                        >
                          {obligation.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ledger.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No ledger activity yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {ledger.map((entry) => (
                <div
                  key={entry.ledgerEntryId}
                  className="flex items-start justify-between px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{entry.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.createdAt ? formatDate(entry.createdAt) : ''}
                      {entry.senderName ? ` • ${entry.senderName}` : ''}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p
                      className={`font-mono text-sm font-medium ${
                        isLedgerCreditEntry(entry.entryType)
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-foreground'
                      }`}
                    >
                      {isLedgerCreditEntry(entry.entryType) ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Bal: {formatCurrency(entry.balanceAfter)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
