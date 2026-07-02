import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatBlock } from '@/components/stat-block'
import { LedgerEntryComponent } from '@/components/ledger-entry'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { mockCustomers, mockObligations, mockLedgers } from '@/lib/mock-data'
import Link from 'next/link'
import { MdArrowBack } from 'react-icons/md'

interface CustomerDetailProps {
  params: Promise<{
    id: string
  }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailProps) {
  const { id } = await params
  const customer = mockCustomers.find((c) => c.id === id)

  if (!customer) {
    return (
      <div className="p-8">
        <Link href="/customers" className="flex items-center gap-2 text-sm text-primary hover:underline mb-4">
          <MdArrowBack className="h-4 w-4" />
          Back to Customers
        </Link>
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    )
  }

  const customerObligations = mockObligations.filter(
    (o) => o.customerId === customer.id
  )
  const customerLedger = mockLedgers
    .filter((l) => l.customerId === customer.id)
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/customers" className="flex items-center gap-2 text-sm text-primary hover:underline mb-6">
        <MdArrowBack className="h-4 w-4" />
        Back to Customers
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start gap-4">
        <Avatar name={customer.full_name} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">{customer.full_name}</h1>
          <p className="text-muted-foreground mt-1">{customer.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge
              variant={customer.status === 'ACTIVE' ? 'success' : 'danger'}
            >
              {customer.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-sm text-muted-foreground font-mono">
              {customer.virtual_account.account_number}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatBlock
          label="Outstanding"
          value={formatCurrency(customer.outstanding)}
        />
        <StatBlock
          label="Wallet Credit"
          value={formatCurrency(customer.walletCredit)}
        />
        <StatBlock
          label="Last Payment"
          value={formatDate(customer.lastPayment)}
        />
      </div>

      {/* Obligations */}
      {customerObligations.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Obligations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customerObligations.map((obligation) => (
                    <tr
                      key={obligation.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium capitalize">{obligation.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {obligation.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {formatCurrency(obligation.amount)}
                      </td>
                      <td className="px-6 py-4">
                        {formatDate(obligation.dueDate)}
                      </td>
                      <td className="px-6 py-4">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger */}
      {customerLedger.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {customerLedger.map((entry) => (
                <LedgerEntryComponent key={entry.id} entry={entry} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
