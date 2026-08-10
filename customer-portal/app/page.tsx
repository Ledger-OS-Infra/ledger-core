"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useLoginMutation } from "@/lib/queries";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const login = useLoginMutation();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setFormError("Please enter your email and password.");
      return;
    }

    setFormError(null);

    login.mutate(
      { email: email.trim(), password },
      { onSuccess: () => router.push("/account") },
    );
  };

  const error =
    formError ??
    (login.error instanceof ApiError
      ? login.error.message
      : login.error
        ? "Something went wrong. Please try again."
        : null);

  return (
    <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="flex items-center gap-1.5 text-[17px] font-medium">
          Ledger-Core
          <span className="sidebar-logo-dot" aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground">Customer portal</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
              if (formError) setFormError(null);
              if (login.isError) login.reset();
            }}
            aria-invalid={error ? true : undefined}
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (formError) setFormError(null);
              if (login.isError) login.reset();
            }}
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={login.isPending} className="mt-2 w-full">
          {login.isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
          Forgot password?
        </Link>
      </p>
    </main>
  );
}