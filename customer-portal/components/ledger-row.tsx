import { FileText, ArrowDownLeft } from "lucide-react";

import { formatDate, formatDateShort, formatNaira } from "@/lib/format";
import type { PortalLedgerEntry } from "@/lib/api";

export function LedgerRow({
  entry,
  showAppliedTo = false,
  compact = false,
}: {
  entry: PortalLedgerEntry;
  showAppliedTo?: boolean;
  compact?: boolean;
}) {
  const isPayment = entry.kind === "payment";

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {isPayment ? (
          <ArrowDownLeft className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <FileText className="h-4 w-4" strokeWidth={1.75} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {compact ? formatDateShort(entry.date) : formatDate(entry.date)}
          {showAppliedTo && entry.applied_to ? ` · ${entry.applied_to}` : ""}
        </p>
      </div>

      <span
        className={
          isPayment
            ? "shrink-0 tabular-nums text-[15px] font-medium text-[var(--success)]"
            : "shrink-0 tabular-nums text-[15px] font-medium text-muted-foreground"
        }
      >
        {isPayment ? "+" : ""}
        {formatNaira(entry.amount)}
      </span>
    </div>
  );
}
