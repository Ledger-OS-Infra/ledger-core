import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonCustom } from '@/components/ui/button-custom'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { mockBillingRules, mockCustomers } from '@/lib/mock-data'
import { MdAdd, MdInfo } from 'react-icons/md'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table'

export default function BillingRulesPage() {
  return (
    <div>
      <PageHeader
        title="Billing Rules"
        description="Automate obligation generation with recurring rules"
      >
        <ButtonCustom variant="primary">
          <MdAdd className="h-4 w-4 mr-2" />
          New Rule
        </ButtonCustom>
      </PageHeader>

      <div className="px-8 py-6 space-y-6">
        {/* Info note */}
        <div className="flex gap-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded border border-blue-200 dark:border-blue-900/50">
          <MdInfo className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Billing rules automatically generate new obligations on their specified schedule. When a rule runs, a new obligation is created and the next run date is updated.
          </p>
        </div>

        {/* Rules Table */}
        <Card  className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow  className="border-b border-border/70 bg-muted/40">
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
                  {mockBillingRules.map((rule) => {
                    const customer = rule.customerId
                      ? mockCustomers.find((c) => c.id === rule.customerId)
                      : null

                    return (
                      <TableRow
                        key={rule.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="px-6 py-4 font-medium">{rule.name}</TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          {customer ? customer.full_name : 'All subscribers'}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono">
                          {formatCurrency(rule.amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          {formatDate(rule.nextRunDate)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant={rule.status === 'active' ? 'success' : 'default'}
                            size="sm"
                          >
                            {rule.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
