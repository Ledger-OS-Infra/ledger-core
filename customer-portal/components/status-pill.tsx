import { cn } from "@/lib/utils";
import type { ObligationStatus } from "@/lib/api";

const STATUS_CONFIG: Record<
  ObligationStatus,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className: "bg-[var(--success)]/15 text-[var(--success)]",
  },
  partial: {
    label: "Partial",
    className: "bg-[var(--warning)]/15 text-[var(--warning)]",
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-destructive/15 text-destructive",
  },
};

export function StatusPill({ status }: { status: ObligationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
