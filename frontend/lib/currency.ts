// Instantiate once — Intl.NumberFormat is expensive to create on every call.
const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) {
    return '₦' + (amount / 1_000_000).toFixed(1) + 'M'
  }
  if (amount >= 1_000) {
    return '₦' + (amount / 1_000).toFixed(1) + 'K'
  }
  return formatCurrency(amount)
}