import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonCustom } from '@/components/ui/button-custom'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { mockObligations, mockCustomers } from '@/lib/mock-data'
import { MdAdd } from 'react-icons/md'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table'

export default function ObligationsPage() {
  return (
    <div>
      <PageHeader
        title="Obligations"
        description="Manage customer obligations and invoices"
      >
        <ButtonCustom variant="primary">
          <MdAdd className="h-4 w-4 mr-2" />
          Create Obligation
        </ButtonCustom>
      </PageHeader>

      <div className="px-8 py-6">
        <Card className="overflow-hidden rounded-2xl border-border/60 py-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/30">
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Obligation
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Customer
                    </TableHead>
                    <TableHead className="px-6 py-3 text-right font-semibold text-xs uppercase text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Due Date
                    </TableHead>
                    <TableHead className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockObligations.map((obligation) => {
                    const customer = mockCustomers.find(
                      (c) => c.id === obligation.customerId
                    )

                    return (
                      <TableRow
                        key={obligation.id}
                        className="border-b border-border hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="px-6 py-4">
                          <div>
                            <p className="font-medium capitalize">
                              {obligation.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {obligation.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <p className="text-sm">{customer?.full_name}</p>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-mono">
                          {formatCurrency(obligation.amount)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {formatDate(obligation.dueDate)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant={
                              obligation.status === 'paid'
                                ? 'success'
                                : obligation.status === 'partial'
                                  ? 'warning'
                                  : 'danger'
                            }
                            size="sm"
                          >
                            {obligation.status}
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
