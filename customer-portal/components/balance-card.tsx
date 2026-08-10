import { CheckCircle2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatNaira } from "@/lib/format";

export function BalanceCard({
  outstandingBalance,
  walletCredit,
}: {
  outstandingBalance: number;
  walletCredit: number;
}) {
  if (outstandingBalance === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 border-b-[3px] border-b-[var(--success)] p-6 text-center">
        <CheckCircle2
          className="h-8 w-8 text-[var(--success)]"
          strokeWidth={1.75}
        />
        <p className="text-[17px] font-medium">You&apos;re all caught up!</p>
        <p className="text-sm text-muted-foreground">
          Wallet credit: <span className="tabular-nums">{formatNaira(walletCredit)}</span>
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-b-[3px] border-b-gold p-6">
      <p className="text-sm text-muted-foreground">Outstanding balance</p>
      <p className="mt-1 text-[32px] font-medium leading-tight tabular-nums text-gold">
        {formatNaira(outstandingBalance)}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Wallet credit: <span className="tabular-nums">{formatNaira(walletCredit)}</span>
      </p>
    </Card>
  );
}
