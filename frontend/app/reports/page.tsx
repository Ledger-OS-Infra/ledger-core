'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useReportsQuery } from '@/lib/queries'
import { formatCurrency } from '@/lib/currency'
import { aggregateReportsAging } from '@/lib/reports-aging'
import { MdOpenInNew } from 'react-icons/md'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function ReportsPage() {
  const { activeBusinessId } = useAuth()
  const { data, isLoading, isError, isFetching } = useReportsQuery(activeBusinessId)

  const monthlyInflow = data?.monthlyInflow ?? []
  const customers = data?.customers ?? []
  const agingRows = data
    ? aggregateReportsAging(data.aging.buckets)
    : []
  const maxAmount = Math.max(0, ...agingRows.map((row) => row.amount))
  const hasInflow = monthlyInflow.some((point) => point.amount > 0)

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Financial analytics and reconciliation reports"
      />

      <div className="px-6 py-6 md:px-8 space-y-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        )}
        {isFetching && data && (
          <p className="text-xs text-muted-foreground">Refreshing…</p>
        )}
        {isError && !data && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load reports. Please try again.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Inflow, last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            {!isLoading && !hasInflow ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No payment inflow recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={monthlyInflow}
                  margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    stroke="var(--muted-foreground)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--foreground)',
                    }}
                    cursor={false}
                    wrapperStyle={{ outline: 'none' }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="var(--gold)"
                    radius={[8, 8, 0, 0]}
                    isAnimationActive
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Outstanding by Age</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agingRows.map((row) => {
                  const percentage =
                    maxAmount > 0 ? (row.amount / maxAmount) * 100 : 0

                  return (
                    <div key={row.label}>
                      <div className="flex justify-between mb-1">
                        <p className="text-sm font-medium">{row.label}</p>
                        <p className="text-sm">
                          <span className="font-mono">
                            {formatCurrency(row.amount)}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            ({row.count} items)
                          </span>
                        </p>
                      </div>
                      <div className="h-2 bg-muted rounded overflow-hidden">
                        <div
                          className={`h-full transition-all ${row.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Statements</CardTitle>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No customers yet. Add a customer to view their ledger and
                  outstanding balance.
                </p>
              ) : (
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <div
                      key={customer.customerId}
                      className="flex items-center justify-between gap-3 p-3 rounded border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {customer.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Outstanding {formatCurrency(customer.totalOutstanding)}
                          {customer.walletCredit > 0 &&
                            ` · Credit ${formatCurrency(customer.walletCredit)}`}
                        </p>
                      </div>
                      <Link
                        href={`/customers/${customer.customerId}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="View customer ledger"
                      >
                        <MdOpenInNew className="h-4 w-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
