"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

import { PortalHeader } from "@/components/portal-header";
import { BalanceCard } from "@/components/balance-card";
import { ObligationCard } from "@/components/obligation-card";
import { LedgerRow } from "@/components/ledger-row";
import { DownloadStatementButton } from "@/components/download-statement-button";
import { ApiError, getPortalToken } from "@/lib/api";
import { useAccountQuery } from "@/lib/queries";

export default function AccountOverviewPage() {
  const router = useRouter();

  // Route guard only — not a data fetch, so a tiny effect is fine here.
  React.useEffect(() => {
    if (!getPortalToken()) {
      router.replace("/");
    }
  }, [router]);

  const { data: account, error, isPending } = useAccountQuery();

  if (error) {
    return (
      <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={1.75} />
        <p className="text-[15px]">
          {error instanceof ApiError
            ? error.message
            : "Couldn't load your account. Please try again."}
        </p>
        <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Back to lookup
        </Link>
      </main>
    );
  }

  if (isPending || !account) {
    return (
      <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      </main>
    );
  }

  const firstName = account.customer.name.split(" ")[0];
  const recent = account.recent_ledger.slice(0, 4);

  return (
    <>
      <PortalHeader
        businessName={account.business.name}
        initials={account.customer.initials}
      />
      <main className="portal-fade mx-auto max-w-[480px] px-5 py-6">
        {/* Greeting + balance hero */}
        <section className="mb-8">
          <h1 className="text-[22px] font-medium">Hello, {firstName}</h1>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            {account.business.name} · Account{" "}
            <span className="tabular-nums">{account.customer.virtual_account}</span>
          </p>
          <BalanceCard
            outstandingBalance={account.balance.outstanding}
            walletCredit={account.balance.wallet_credit}
          />
        </section>

        {/* What you owe */}
        {account.obligations.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-3 text-base font-medium">What you owe</h2>
            <div className="flex flex-col gap-3">
              {account.obligations.map((obligation) => (
                <ObligationCard
                  key={obligation.id}
                  obligation={obligation}
                  virtualAccount={account.customer.virtual_account}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-8 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-6 w-6 text-[var(--success)]" strokeWidth={1.75} />
            Nothing outstanding right now.
          </section>
        )}

        {/* Recent payments */}
        {recent.length > 0 ? (
          <section className="mb-8">
            <h2 className="mb-1 text-base font-medium">Recent payments</h2>
            <div className="divide-y divide-border">
              {recent.map((entry) => (
                <LedgerRow key={entry.id} entry={entry} compact />
              ))}
            </div>
            <Link
              href="/account/history"
              className="mt-2 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              View full history
            </Link>
          </section>
        ) : null}

        {/* Download statement */}
        <section>
          <DownloadStatementButton />
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Shows your complete payment history for this account.
          </p>
        </section>
      </main>
    </>
  );
}
