'use client'

import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { StatBlock } from '@/components/stat-block'
import { Badge } from '@/components/ui/badge'
import { reportingClient } from '@/lib/api'
import { formatCurrency, formatCurrencyShort } from '@/lib/currency'
import { mockCustomers, mockObligations, mockTransactions } from '@/lib/mock-data'
import { calculateAgingBuckets } from '@/lib/obligations'
import { MdWarning } from 'react-icons/md'

const BUSINESS_ID = 'demo-business'

export default function DashboardPage() {
  const { data: dashboardData, isPending, isError } = useQuery({
    queryKey: ['dashboard', BUSINESS_ID],
    queryFn: async () => {
      try {
        const [metrics, aging] = await Promise.all([
          reportingClient.getBusinessMetrics(BUSINESS_ID),
          reportingClient.listAging(BUSINESS_ID),
        ])

        return {
          metrics,
          agingSummary: aging.summary,
        }
      } catch {
        // Fallback: derive metrics from mock data when the API is unavailable
        return {
          metrics: {
            totalOutstanding: mockCustomers.reduce((sum, c) => sum + c.outstanding, 0),
            overdueAmount: mockCustomers
              .filter((c) => c.status === 'overdue')
              .reduce((sum, c) => sum + c.outstanding, 0),
            overdueObligationCount: mockCustomers.filter((c) => c.status === 'overdue').length,
            totalInflow: 0,
            totalWalletCredit: mockCustomers.reduce((sum, c) => sum + c.walletCredit, 0),
          },
          agingSummary: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
        }
      }
    },
    staleTime: 60_000,
  })

  // Fallback mirrors the shape above when data hasn't loaded yet
  const dashboardMetrics = dashboardData?.metrics ?? {
    totalOutstanding: mockCustomers.reduce((sum, c) => sum + c.outstanding, 0),
    overdueAmount: mockCustomers
      .filter((c) => c.status === 'overdue')
      .reduce((sum, c) => sum + c.outstanding, 0),
    overdueObligationCount: mockCustomers.filter((c) => c.status === 'overdue').length,
    totalInflow: 0,
    totalWalletCredit: mockCustomers.reduce((sum, c) => sum + c.walletCredit, 0),
  }

  // Calculate metrics
  const thisMonth = new Date()
  const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)

  const inflowThisMonth = mockTransactions
    .filter((t) => t.date >= thisMonthStart)
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOutstanding = dashboardMetrics.totalOutstanding
  const totalOverdue = dashboardMetrics.overdueAmount
  // The API doesn't return a total customer count; use mock length as a stand-in
  const activeCustomers = mockCustomers.length
  const unmatchedTransactions = mockTransactions.filter((t) => t.status === 'unmatched')

  // Aging buckets — computed via shared utility
  const agingBuckets = calculateAgingBuckets(mockObligations)
  const maxAging = Math.max(...Object.values(agingBuckets))

  const recentTransactions = mockTransactions.slice(0, 5)


  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your financial reconciliation"
      />

      {/* Metrics Grid */}
      <div className="px-8 py-6">
        {isPending && (
          <div className="mb-4 text-sm text-muted-foreground">Loading live dashboard data…</div>
        )}
        {isError && (
          <div className="mb-4 text-sm text-muted-foreground">Using fallback data while the API is unavailable.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatBlock
            label="Inflow This Month"
            value={formatCurrencyShort(inflowThisMonth)}
          />
          <StatBlock
            label="Outstanding"
            value={formatCurrencyShort(totalOutstanding)}
          />
          <StatBlock
            label="Overdue"
            value={formatCurrencyShort(totalOverdue)}
            description={unmatchedTransactions.length > 0 ? `${unmatchedTransactions.length} unmatched` : 'All matched'}
          />
          <StatBlock
            label="Active Customers"
            value={activeCustomers}
          />
        </div>

        {/* Warning Banner */}
        {unmatchedTransactions.length > 0 && (
          <div className="mb-8 border-l-4 border-destructive bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded">
            <div className="flex gap-3">
              <MdWarning className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  {unmatchedTransactions.length} unmatched transactions
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please review and assign these transactions to reconcile your accounts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <Card>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold">Recent Transactions</h2>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentTransactions.length === 0 ? (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No transactions yet
                    </div>
                  ) : (
                    recentTransactions.map((transaction) => {
                      const customer = mockCustomers.find(
                        (c) => c.id === transaction.customerId
                      )

                      const statusVariant =
                        transaction.status === 'matched'
                          ? 'success'
                          : transaction.status === 'unmatched'
                            ? 'danger'
                            : 'warning'

                      return (
                        <div
                          key={transaction.id}
                          className="px-6 py-4 flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {customer?.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {transaction.reasoning}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium font-mono text-sm">
                              {formatCurrency(transaction.amount)}
                            </p>
                            <Badge variant={statusVariant} size="sm" className="mt-1">
                              {transaction.status}
                            </Badge>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aging Report */}
          <div>
            <Card>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold">Aging Report</h2>
              </div>
              <CardContent className="p-0">
                <div className="space-y-4 px-6 py-4">
                  {(
                    [
                      { label: '0-30 days', key: '0-30' },
                      { label: '31-60 days', key: '31-60' },
                      { label: '61-90 days', key: '61-90' },
                      { label: '90+ days', key: '90+' },
                    ] as const
                  ).map(({ label, key }) => {
                    const amount = agingBuckets[key]
                    const percentage = maxAging > 0 ? (amount / maxAging) * 100 : 0

                    return (
                      <div key={key}>
                        <div className="flex justify-between mb-1">
                          <p className="text-xs font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrencyShort(amount)}
                          </p>
                        </div>
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              key === '0-30'
                                ? 'bg-green-500'
                                : key === '31-60'
                                  ? 'bg-yellow-500'
                                  : key === '61-90'
                                    ? 'bg-orange-500'
                                    : 'bg-red-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
