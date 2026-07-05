import type { AgingBucketSummary } from '@/lib/api/types'

export const REPORTS_AGING_ROWS = [
  { label: '0-30 days', keys: ['current', '1_30_days'], color: 'bg-green-500' },
  { label: '31-60 days', keys: ['31_60_days'], color: 'bg-yellow-500' },
  { label: '61-90 days', keys: ['61_90_days'], color: 'bg-orange-500' },
  { label: '90+ days', keys: ['90_plus_days'], color: 'bg-red-500' },
] as const

export interface ReportsAgingRow {
  label: string
  amount: number
  count: number
  color: string
}

export function aggregateReportsAging(
  buckets: Record<string, AgingBucketSummary>,
): ReportsAgingRow[] {
  return REPORTS_AGING_ROWS.map((row) => ({
    label: row.label,
    color: row.color,
    amount: row.keys.reduce((sum, key) => sum + (buckets[key]?.amount ?? 0), 0),
    count: row.keys.reduce((sum, key) => sum + (buckets[key]?.count ?? 0), 0),
  }))
}
