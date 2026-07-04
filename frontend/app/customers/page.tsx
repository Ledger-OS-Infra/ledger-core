'use client'

import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddCustomerModal } from '@/components/add-customer-modal'
import { useCustomersQuery } from '@/lib/queries'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/currency'
import Link from 'next/link'
import { MdCheckCircle, MdContentCopy } from 'react-icons/md'

function VirtualAccountCell({
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

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="font-mono text-xs text-foreground/80">{accountNumber}</div>
        <div className="text-[11px] text-muted-foreground">{bankName}</div>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy account number'}
        aria-label={copied ? 'Copied' : 'Copy account number'}
        className={`mt-0.5 shrink-0 rounded p-1 transition-colors ${
          copied
            ? 'text-green-600 dark:text-green-400'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        {copied ? (
          <MdCheckCircle className="h-4 w-4" />
        ) : (
          <MdContentCopy className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export default function CustomersPage() {
  const { activeBusinessId } = useAuth()

  const {
    data: customers = [],
    isLoading,
    isFetching,
    isError,
  } = useCustomersQuery(activeBusinessId)

  const showInitialLoading = !activeBusinessId || (isLoading && customers.length === 0)

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage and view all customer accounts"
      >
        {activeBusinessId && <AddCustomerModal businessId={activeBusinessId} />}
      </PageHeader>

      <div className="px-6 py-6 md:px-8">
        {isFetching && customers.length > 0 && (
          <p className="mb-3 text-xs text-muted-foreground">Refreshing…</p>
        )}
        <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="border-b border-border/70 bg-muted/40">
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Customer
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Virtual Account
                    </TableHead>
                    <TableHead className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Outstanding
                    </TableHead>
                    <TableHead className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Wallet Credit
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
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-muted-foreground"
                      >
                        Loading customers…
                      </TableCell>
                    </TableRow>
                  ) : isError && customers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-destructive"
                      >
                        Couldn&apos;t load customers. Please try again.
                      </TableCell>
                    </TableRow>
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-muted-foreground"
                      >
                        No customers yet. Add your first customer to generate a
                        virtual account.
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="border-b border-border/60 transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="px-6 py-4">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-1 hover:underline transition-colors hover:bg-muted/60"
                          >
                            <Avatar
                              name={customer.full_name}
                              size="lg"
                              shape="square"
                              className="underline-offset-0"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {customer.full_name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {customer.email ?? '—'}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <VirtualAccountCell
                            accountNumber={customer.virtual_account.account_number}
                            bankName={customer.virtual_account.bank_name}
                          />
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground">
                          {formatCurrency(customer.outstanding)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(customer.walletCredit)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant={
                              customer.status === 'ACTIVE' ? 'success' : 'danger'
                            }
                            size="sm"
                            className="rounded-full"
                          >
                            {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
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
      </div>
    </div>
  )
}
