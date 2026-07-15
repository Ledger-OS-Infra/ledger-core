"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useForgotPasswordMutation } from "@/lib/queries";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const forgotPassword = useForgotPasswordMutation();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    forgotPassword.mutate(email.trim(), {
      onSuccess: () => setSubmitted(true),
    });
  };

  const error =
    forgotPassword.error instanceof ApiError
      ? forgotPassword.error.message
      : forgotPassword.error
        ? "Something went wrong. Please try again."
        : null;

  return (
    <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="text-[17px] font-medium">Reset your password</span>
        <p className="text-sm text-muted-foreground">
          Enter the email your temporary password was sent to.
        </p>
      </div>

      {submitted ? (
        <p className="text-center text-sm text-muted-foreground">
          If an account with that email exists, we&apos;ve sent password
          reset instructions.
        </p>
      ) : (
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
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-md border border-border bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={forgotPassword.isPending} className="mt-2 w-full">
            {forgotPassword.isPending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          Back to login
        </Link>
      </p>
    </main>
  );
}