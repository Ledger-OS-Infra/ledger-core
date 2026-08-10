"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/status-pill";
import { formatDate, formatNaira } from "@/lib/format";
import type { PortalObligation } from "@/lib/api";

export function ObligationCard({
  obligation,
  virtualAccount,
}: {
  obligation: PortalObligation;
  virtualAccount: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const needsPayment = obligation.status !== "paid";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(virtualAccount);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail silently (e.g. unsupported browser); no action needed.
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-medium">{obligation.name}</span>
        <span className="shrink-0 text-sm text-muted-foreground">
          Due {formatDate(obligation.due_date)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="tabular-nums text-[17px] font-medium">
          {formatNaira(obligation.remaining)}
        </span>
        <StatusPill status={obligation.status} />
      </div>

      {needsPayment ? (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground">
            Pay to account{" "}
            <span className="tabular-nums font-medium text-foreground">
              {virtualAccount}
            </span>
          </p>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy account number"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[var(--success)]" strokeWidth={2} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      ) : null}
    </Card>
  );
}
