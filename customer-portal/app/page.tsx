"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useLookupMutation } from "@/lib/queries";

const BUSINESS_NAME = "";

export default function LookupPage() {
  const router = useRouter();
  const [accountNumber, setAccountNumber] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const lookup = useLookupMutation();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (accountNumber.trim().length === 0) {
      setFormError("Please enter your account number.");
      return;
    }

    setFormError(null);

    lookup.mutate(
      {
        accountNumber: accountNumber.trim(),
        email: email.trim(),
      },
      {
        onSuccess: () => router.push("/account"),
      },
    );
  };

  const error =
    formError ??
    (lookup.error instanceof ApiError
      ? lookup.error.message
      : lookup.error
        ? "Something went wrong. Please try again."
        : null);

  return (
    <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="flex items-center gap-1.5 text-[17px] font-medium">
          Ledger-Core
          <span className="sidebar-logo-dot" aria-hidden="true" />
        </span>

        <p className="text-sm text-muted-foreground">
          Customer portal
          {BUSINESS_NAME.trim() && ` ${BUSINESS_NAME}`}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-number" className="text-sm font-medium">
            Account number
          </label>

          <input
            id="account-number"
            name="accountNumber"
            type="text"
            inputMode="numeric"
            placeholder="Your account number"
            value={accountNumber}
            onChange={(event) => {
              setAccountNumber(event.target.value);

              if (formError) {
                setFormError(null);
              }

              if (lookup.isError) {
                lookup.reset();
              }
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "account-number-error" : undefined}
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-[15px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email address
          </label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);

              if (formError) {
                setFormError(null);
              }

              if (lookup.isError) {
                lookup.reset();
              }
            }}
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error ? (
          <p
            id="account-number-error"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={lookup.isPending}
          className="mt-2 w-full"
        >
          {lookup.isPending ? "Checking…" : "View my account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Your account number was provided
        {BUSINESS_NAME.trim() ? ` by ${BUSINESS_NAME}` : ""} when you were
        registered.
      </p>
    </main>
  );
}