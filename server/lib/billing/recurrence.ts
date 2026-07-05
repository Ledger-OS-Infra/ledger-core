/** Billing period key for reference codes and metadata, e.g. 2026-06 */
export function billingPeriodFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** DSTV-style monthly billing unit reference, e.g. MBU-2026-06 */
export function billingReferenceCode(isoDate: string, prefix = "MBU"): string {
  return `${prefix}-${billingPeriodFromDate(isoDate)}`;
}

/**
 * Advance monthly next_run_date, clamping day to 1–28 per schema convention.
 */
export function advanceMonthlyRunDate(
  currentRunDate: string,
  dayOfMonth: number,
): string {
  const [yearStr, monthStr] = currentRunDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const clampedDay = Math.min(Math.max(dayOfMonth, 1), 28);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const monthPadded = String(nextMonth).padStart(2, "0");
  const dayPadded = String(clampedDay).padStart(2, "0");

  return `${nextYear}-${monthPadded}-${dayPadded}`;
}

export function isOnOrBefore(asOfDate: string, dueDate: string): boolean {
  return dueDate <= asOfDate;
}
