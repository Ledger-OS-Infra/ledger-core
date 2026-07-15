"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { useResetPasswordMutation } from "@/lib/queries";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const resetPassword = useResetPasswordMutation();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setFormError("Passwords don't match.");
      return;
    }

    setFormError(null);

    resetPassword.mutate(
      { token, password },
      { onSuccess: () => setDone(true) },
    );
  };

  const error =
    formError ??
    (resetPassword.error instanceof ApiError
      ? resetPassword.error.message
      : resetPassword.error
        ? "Something went wrong. Please try again."
        : null);

  if (!token) {
    return (
      <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-destructive">
          This reset link is missing or invalid.
        </p>
        <Link href="/forgot-password" className="mt-4 text-sm underline underline-offset-4">
          Request a new link
        </Link>
      </main>
    );
  }

  if (done) {
    return (
      <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Your password has been reset. You can now log in.
        </p>
        <Button onClick={() => router.push("/")}>Go to login</Button>
      </main>
    );
  }

  return (
    <main className="portal-fade mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-6 py-10">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="text-[17px] font-medium">Set a new password</span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            New password
          </label>
          <input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            placeholder="Re-enter password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-12 w-full rounded-md border border-border bg-card px-4 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={resetPassword.isPending} className="mt-2 w-full">
          {resetPassword.isPending ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </main>
  );
}