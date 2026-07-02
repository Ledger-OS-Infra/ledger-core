import { LedgerEntry } from '@/lib/mock-data'
import { MdArrowDownward, MdReceiptLong, MdPerson, MdCardGiftcard, MdRefresh } from 'react-icons/md'
import { formatCurrency } from '@/lib/currency'

function getLedgerIcon(type: LedgerEntry['type']) {
  switch (type) {
    case 'payment_received':
      return <MdArrowDownward className="w-5 h-5 text-green-500" />
    case 'invoice_created':
      return <MdReceiptLong className="w-5 h-5 text-blue-500" />
    case 'account_created':
      return <MdPerson className="w-5 h-5 text-blue-600" />
    case 'credit_applied':
      return <MdCardGiftcard className="w-5 h-5 text-emerald-500" />
    case 'refund_issued':
      return <MdRefresh className="w-5 h-5 text-red-500" />
    default:
      return null
  }
}

function getLedgerAmountColor(type: LedgerEntry['type']) {
  switch (type) {
    case 'payment_received':
      return 'text-green-500'
    case 'refund_issued':
      return 'text-green-500'
    case 'credit_applied':
      return 'text-emerald-500'
    default:
      return 'text-foreground'
  }
}

interface LedgerEntryProps {
  entry: LedgerEntry
}

export function LedgerEntryComponent({ entry }: LedgerEntryProps) {
  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-border last:border-b-0">
      <div className="mt-1 flex-shrink-0">
        {getLedgerIcon(entry.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">
          {entry.title}
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">
          {entry.description}
        </div>
      </div>
      {entry.amount && (
        <div className={`font-semibold text-right flex-shrink-0 ${getLedgerAmountColor(entry.type)}`}>
          {entry.type === 'payment_received' || entry.type === 'refund_issued' || entry.type === 'credit_applied'
            ? `+${formatCurrency(entry.amount)}`
            : formatCurrency(entry.amount)}
        </div>
      )}
      {!entry.amount && (
        <div className="text-muted-foreground flex-shrink-0">
          —
        </div>
      )}
    </div>
  )
}
