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
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { mockCustomers } from '@/lib/mock-data'
import Link from 'next/link'

export default function CustomersPage() {
  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage and view all customer accounts"
      />

      <div className="px-6 py-6 md:px-8">
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
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Last Payment
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="border-b border-border/60 transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="px-6 py-4">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-1 hover:underline transition-colors hover:bg-muted/60"
                        >
                          <Avatar name={customer.full_name} size="lg" shape="square" className='underline-offset-0' />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {customer.full_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {customer.email}
                            </p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-xs text-foreground/80">
                        {customer.virtual_account.account_number}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground">
                        {formatCurrency(customer.outstanding)}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(customer.lastPayment)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant={customer.status === 'ACTIVE' ? 'success' : 'danger'}
                          size="sm"
                          className="rounded-full"
                        >
                          {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
