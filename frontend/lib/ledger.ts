/** Entry types that represent money in / credit to the customer (show +). */
const CREDIT_ENTRY_TYPES = new Set(['CREDIT', 'WALLET_APPLIED'])

export function isLedgerCreditEntry(entryType: string): boolean {
  return CREDIT_ENTRY_TYPES.has(entryType.toUpperCase())
}
