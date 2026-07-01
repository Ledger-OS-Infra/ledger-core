/**
 * Builds the last-6-months monthly inflow dataset for chart rendering.
 * Extracted from ReportsPage so the component stays focused on presentation.
 */

export interface MonthlyInflowPoint {
  month: string
  amount: number
}

// Sample inflow amounts per month offset from today (0 = current month)
const SAMPLE_INFLOW: { months: number; amount: number }[] = [
  { months: 5, amount: 420_000 },
  { months: 4, amount: 580_000 },
  { months: 3, amount: 390_000 },
  { months: 2, amount: 650_000 },
  { months: 1, amount: 510_000 },
  { months: 0, amount: 720_000 },
]

export function getMonthlyInflowData(today = new Date()): MonthlyInflowPoint[] {
  return SAMPLE_INFLOW.map(({ months, amount }) => {
    const date = new Date(today.getFullYear(), today.getMonth() - months, 1)
    const month = date.toLocaleDateString('en-NG', { month: 'short' })
    return { month, amount }
  }).reverse()
}
