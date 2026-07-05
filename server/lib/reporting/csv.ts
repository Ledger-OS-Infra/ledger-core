import type { ObligationAgingRow } from "../../db/reporting";

const CSV_HEADERS = [
  "Obligation ID",
  "Customer",
  "Type",
  "Reference Code",
  "Amount (NGN)",
  "Amount Paid (NGN)",
  "Outstanding (NGN)",
  "Due Date",
  "Status",
  "Days Overdue",
];

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function koboToNaira(value: string | number): string {
  return (Number(value) / 100).toFixed(2);
}

export function buildObligationsCsv(rows: ObligationAgingRow[]): string {
  const lines = [CSV_HEADERS.map(escapeCsvValue).join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.obligation_id,
        row.customer_name,
        row.obligation_type,
        row.reference_code ?? "",
        koboToNaira(row.amount),
        koboToNaira(row.amount_paid),
        koboToNaira(row.outstanding),
        row.due_date,
        row.status,
        row.days_overdue,
      ]
        .map(escapeCsvValue)
        .join(","),
    );
  }

  // Leading BOM so Excel opens UTF-8 correctly
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}