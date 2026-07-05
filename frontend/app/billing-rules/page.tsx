'use client'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AddBillingRuleModal,
  billingRuleDisplayName,
} from '@/components/add-billing-rule-modal'
import { useAuth } from '@/hooks/use-auth'
import { useBillingRulesQuery } from '@/lib/queries'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { MdInfo } from 'react-icons/md'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function BillingRulesPage() {
  const { activeBusinessId } = useAuth()

  const {
    data: rules = [],
    isLoading,
    isFetching,
    isError,
  } = useBillingRulesQuery(activeBusinessId)

  const showInitialLoading =
    !activeBusinessId || (isLoading && rules.length === 0)

  return (
    <div>
      <PageHeader
        title="Billing Rules"
        description="Automate obligation generation with recurring rules"
      >
        {activeBusinessId && (
          <AddBillingRuleModal businessId={activeBusinessId} />
        )}
      </PageHeader>

      <div className="px-6 py-6 md:px-8 space-y-6">
        <div className="flex gap-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded border border-blue-200 dark:border-blue-900/50">
          <MdInfo className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Billing rules automatically generate new obligations on their
            specified schedule. When a rule runs, a new obligation is created
            and the next run date is updated.
          </p>
        </div>

        {isFetching && rules.length > 0 && (
          <p className="text-xs text-muted-foreground">Refreshing…</p>
        )}

        {isError && !showInitialLoading && (
          <p className="text-sm text-destructive">
            Couldn&apos;t load billing rules. Please try again.
          </p>
        )}

        <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="border-b border-border/70 bg-muted/40">
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Rule Name
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Applies To
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right font-semibold text-xs uppercase text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Next Run
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
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
                        Loading billing rules…
                      </TableCell>
                    </TableRow>
                  ) : rules.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-muted-foreground"
                      >
                        No billing rules yet. Create one to auto-generate
                        recurring obligations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rules.map((rule) => (
                      <TableRow
                        key={rule.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="px-6 py-4 font-medium">
                          {billingRuleDisplayName(rule)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          {rule.customerName}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono">
                          {formatCurrency(rule.amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          {formatDate(rule.nextRunDate)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant={rule.isActive ? 'success' : 'default'}
                            size="sm"
                          >
                            {rule.isActive ? 'active' : 'paused'}
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
