"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { PortalHeader } from "@/components/portal-header";
import { LedgerRow } from "@/components/ledger-row";
import { DownloadStatementButton } from "@/components/download-statement-button";
import { ApiError, getPortalToken, type PortalLedgerEntry } from "@/lib/api";
import { useAccountQuery, useHistoryQuery } from "@/lib/queries";
import { monthLabel } from "@/lib/format";

function groupByMonth(entries: PortalLedgerEntry[]) {
  const groups: { label: string; entries: PortalLedgerEntry[] }[] = [];

  for (const entry of entries) {
    const label = monthLabel(entry.date);
    const current = groups.at(-1);
    if (current && current.label === label) {
      current.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  }

  return groups;
}

export default function HistoryPage() {
  const router = useRouter();

  // Route guard only — not a data fetch, so a tiny effect is fine here.
  React.useEffect(() => {
    if (!getPortalToken()) {
      router.replace("/");
    }
  }, [router]);

  const accountQuery = useAccountQuery();
  const historyQuery = useHistoryQuery();

  const error = accountQuery.error ?? historyQuery.error;
  const isPending = accountQuery.isPending || historyQuery.isPending;
  const account = accountQuery.data;
  const entries = historyQuery.data;

  if (error) {
    return (
      <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={1.75} />
        <p className="text-[15px]">
          {error instanceof ApiError
            ? error.message
            : "Couldn't load your history. Please try again."}
        </p>
        <Link href="/account" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Back to account
        </Link>
      </main>
    );
  }

  if (isPending || !account || !entries) {
    return (
      <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading your history…</p>
      </main>
    );
  }

  const groups = groupByMonth(entries);

  return (
    <>
      <PortalHeader
        businessName={account.business.name}
        initials={account.customer.initials}
        backHref="/account"
        backLabel="Back to account overview"
      />
      <main className="portal-fade mx-auto max-w-[480px] px-5 py-6 pb-28">
        <h1 className="text-[22px] font-medium">Payment history</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">
          {account.customer.name} ·{" "}
          <span className="tabular-nums">
            Account {account.customer.virtual_account}
          </span>
        </p>

        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="divide-y divide-border">
                {group.entries.map((entry) => (
                  <LedgerRow key={entry.id} entry={entry} showAppliedTo />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex justify-center pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="w-[calc(100%-32px)] max-w-[448px]">
          <DownloadStatementButton />
        </div>
      </div>
    </>
  );
}
