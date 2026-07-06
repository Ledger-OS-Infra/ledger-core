"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatBlock } from "@/components/stat-block";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardQuery } from "@/lib/queries";
import { formatCurrency, formatCurrencyShort } from "@/lib/currency";
import { MdWarning } from "react-icons/md";

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
}

// Aging buckets emitted by the backend (v_obligation_aging) mapped onto the
// four display buckets shown here. `current` (not yet due) folds into 0-30.
const AGING_ROWS = [
  { label: "0-30 days", keys: ["current", "1_30_days"], color: "bg-green-500" },
  { label: "31-60 days", keys: ["31_60_days"], color: "bg-yellow-500" },
  { label: "61-90 days", keys: ["61_90_days"], color: "bg-orange-500" },
  { label: "90+ days", keys: ["90_plus_days"], color: "bg-red-500" },
] as const;

export default function DashboardPage() {
  const { activeBusinessId, activeBusinessName } = useAuth();

  const { data, isLoading, isFetching, isError } = useDashboardQuery(activeBusinessId);

  const metrics = data?.metrics;
  const transactions = data?.transactions ?? [];
  const customers = data?.customers ?? [];
  const agingSummary = data?.agingSummary ?? {};
  const nombaAccount = data?.nombaAccount ?? null;

  const totalInflow = metrics?.totalInflow ?? 0;
  const totalOutstanding = metrics?.totalOutstanding ?? 0;
  const totalOverdue = metrics?.overdueAmount ?? 0;
  const overdueCount = metrics?.overdueObligationCount ?? 0;

  const activeCustomers = customers.filter(
    (customer) => customer.status === "ACTIVE",
  ).length;

  const unmatchedTransactions = transactions.filter(
    (transaction) => !transaction.isMatched,
  );

  const agingBuckets = AGING_ROWS.map((row) => ({
    ...row,
    amount: row.keys.reduce((sum, key) => sum + (agingSummary[key] ?? 0), 0),
  }));
  const maxAging = Math.max(0, ...agingBuckets.map((bucket) => bucket.amount));

  return (
    <div>
      <PageHeader
        title={activeBusinessName ?? "Dashboard"}
        description="Overview of your financial reconciliation"
      />

      {/* Metrics Grid */}
      <div className="px-8 py-6">
        {isLoading && (
          <div className="mb-4 text-sm text-muted-foreground">
            Loading dashboard…
          </div>
        )}
        {isFetching && data && (
          <div className="mb-4 text-xs text-muted-foreground">
            Refreshing…
          </div>
        )}
        {isError && !data && (
          <div className="mb-4 text-sm text-destructive">
            Couldn&apos;t load dashboard data. Please try again.
          </div>
        )}

        {nombaAccount && (
          <Card className="mb-8">
            <div className="px-6 py-4 border-b border-border flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Settlement account</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Nomba sub-account where customer VA payments settle
                </p>
              </div>
              <Badge
                variant={nombaAccount.status === "ACTIVE" ? "success" : "warning"}
                size="sm"
              >
                {nombaAccount.status.toLowerCase()}
              </Badge>
            </div>
            <CardContent className="px-6 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Available balance
                  </p>
                  <p className="mt-2 text-3xl font-semibold font-mono">
                    {formatCurrency(nombaAccount.balance)}
                  </p>
                  {nombaAccount.balanceAsOf && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      As of {formatDate(nombaAccount.balanceAsOf)}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Account holder
                  </p>
                  <p className="mt-2 font-medium">{nombaAccount.accountName}</p>
                  <p className="mt-1 text-xs text-muted-foreground font-mono break-all">
                    {nombaAccount.subAccountId}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Linked bank account
                  </p>
                  {nombaAccount.bankAccounts.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No bank account on file
                    </p>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {nombaAccount.bankAccounts.map((bank) => (
                        <div key={`${bank.bankName}-${bank.accountNumber}`}>
                          <p className="font-mono font-medium">
                            {bank.accountNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {bank.bankName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {bank.accountName}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatBlock
            label="Total Inflow"
            value={formatCurrencyShort(totalInflow)}
          />
          <StatBlock
            label="Outstanding"
            value={formatCurrencyShort(totalOutstanding)}
          />
          <StatBlock
            label="Overdue"
            value={formatCurrencyShort(totalOverdue)}
            description={
              overdueCount > 0 ? `${overdueCount} overdue` : "None overdue"
            }
          />
          <StatBlock label="Active Customers" value={activeCustomers} />
        </div>

        {/* Warning Banner */}
        {unmatchedTransactions.length > 0 && (
          <div className="mb-8 border-l-4 border-destructive bg-red-50 dark:bg-red-950/20 px-4 py-3 rounded">
            <div className="flex gap-3">
              <MdWarning className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  {unmatchedTransactions.length} unmatched transactions
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please review and assign these transactions to reconcile your
                  accounts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <Card>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold">Recent Transactions</h2>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {transactions.length === 0 ? (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">
                      No transactions yet
                    </div>
                  ) : (
                    transactions.map((transaction) => {
                      const title =
                        transaction.customerName ??
                        transaction.senderName ??
                        "Unknown sender";

                      const subtitle = transaction.isMatched
                        ? `Matched${transaction.receivedAt ? ` • ${formatDate(transaction.receivedAt)}` : ""}`
                        : `Unmatched — needs review${transaction.receivedAt ? ` • ${formatDate(transaction.receivedAt)}` : ""}`;

                      return (
                        <div
                          key={transaction.id}
                          className="px-6 py-4 flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {subtitle}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-medium font-mono text-sm">
                              {formatCurrency(transaction.amount)}
                            </p>
                            <Badge
                              variant={
                                transaction.isMatched ? "success" : "danger"
                              }
                              size="sm"
                              className="mt-1"
                            >
                              {transaction.isMatched ? "matched" : "unmatched"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aging Report */}
          <div>
            <Card>
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold">Aging Report</h2>
              </div>
              <CardContent className="p-0">
                <div className="space-y-4 px-6 py-4">
                  {agingBuckets.map((bucket) => {
                    const percentage =
                      maxAging > 0 ? (bucket.amount / maxAging) * 100 : 0;

                    return (
                      <div key={bucket.label}>
                        <div className="flex justify-between mb-1">
                          <p className="text-xs font-medium">{bucket.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrencyShort(bucket.amount)}
                          </p>
                        </div>
                        <div className="h-2 bg-muted rounded overflow-hidden">
                          <div
                            className={`h-full transition-all ${bucket.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
