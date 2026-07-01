import { differenceInCalendarDays } from 'date-fns'

// ---------------------------------------------------------------------------
// Status enum — values match the server exactly (UPPERCASE)
// ---------------------------------------------------------------------------

export enum ObligationStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  OVERDUE = 'OVERDUE',
}

// ---------------------------------------------------------------------------
// Aging bucket types
// ---------------------------------------------------------------------------

export type AgingKey = '0-30' | '31-60' | '61-90' | '90+'

export interface ObligationLike {
  status: string
  dueDate: Date
  amount: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the aging bucket key for a given number of days overdue.
 * Negative values (not yet due) fall into the '0-30' bucket.
 */
export function getAgingBucket(daysOverdue: number): AgingKey {
  if (daysOverdue <= 30) return '0-30'
  if (daysOverdue <= 60) return '31-60'
  if (daysOverdue <= 90) return '61-90'
  return '90+'
}

// ---------------------------------------------------------------------------
// Dashboard: simple amount-only buckets
// ---------------------------------------------------------------------------

export type AgingBuckets = Record<AgingKey, number>

export function calculateAgingBuckets(
  obligations: ObligationLike[],
  today = new Date(),
): AgingBuckets {
  const buckets: AgingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }

  obligations
    .filter((o) => o.status.toUpperCase() !== ObligationStatus.PAID)
    .forEach((o) => {
      const daysOverdue = differenceInCalendarDays(today, o.dueDate)
      buckets[getAgingBucket(daysOverdue)] += o.amount
    })

  return buckets
}

// ---------------------------------------------------------------------------
// Reports: detailed buckets with count + amount
// ---------------------------------------------------------------------------

export interface AgingBucketDetail {
  count: number
  amount: number
}

export type DetailedAgingBuckets = Record<AgingKey, AgingBucketDetail>

export function calculateDetailedAgingBuckets(
  obligations: ObligationLike[],
  today = new Date(),
): DetailedAgingBuckets {
  const buckets: DetailedAgingBuckets = {
    '0-30': { count: 0, amount: 0 },
    '31-60': { count: 0, amount: 0 },
    '61-90': { count: 0, amount: 0 },
    '90+': { count: 0, amount: 0 },
  }

  obligations
    .filter((o) => o.status.toUpperCase() !== ObligationStatus.PAID)
    .forEach((o) => {
      const daysOverdue = differenceInCalendarDays(today, o.dueDate)
      const key = getAgingBucket(daysOverdue)
      buckets[key].count += 1
      buckets[key].amount += o.amount
    })

  return buckets
}
