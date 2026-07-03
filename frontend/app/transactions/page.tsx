import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ButtonCustom } from '@/components/ui/button-custom'
import { formatCurrency } from '@/lib/currency'
import { formatDate } from '@/lib/date'
import { mockTransactions, mockCustomers } from '@/lib/mock-data'

export default function TransactionsPage() {
  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Review and reconcile payment transactions"
      />

      <div className="px-8 py-6 space-y-4">
        {mockTransactions.map((transaction) => {
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
            <Card
              key={transaction.id}
              className={`p-4 border-l-4 ${
                transaction.status === 'unmatched'
                  ? 'border-l-destructive'
                  : 'border-l-primary'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold">{customer?.full_name}</p>
                    <Badge variant={statusVariant} size="sm">
                      {transaction.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {transaction.reasoning}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {transaction.reference} · {formatDate(transaction.date)}
                  </p>
                </div>
                <div className="ml-6 text-right">
                  <p className="text-lg font-semibold font-mono">
                    {formatCurrency(transaction.amount)}
                  </p>
                  {transaction.status === 'unmatched' && (
                    <ButtonCustom
                      variant="primary"
                      size="sm"
                      className="mt-2"
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
    </div>
  )
}
