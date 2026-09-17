"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthError, AuthShell } from "@/components/portal/AuthShell";
import { Button, Field, Input } from "@/components/independent/ui";
import { requestReset, RESET_WINDOW_HOURS, type ResetLink } from "@/lib/demo/auth";

/** OB-004 — a reset link for a registered address; an unknown one is told so. */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<ResetLink | null>(null);

  if (sent)
    return (
      <AuthShell
        title="Check your email"
        subtitle={`A reset link is on its way to ${sent.email}. It works once and expires after ${RESET_WINDOW_HOURS} hours.`}
        footer={
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        }
      >
        {/* No mail server in the demo, so the link that would have been emailed is here. */}
        <div className="flex flex-col gap-2 rounded-lg bg-surface-2 p-4 text-[12.5px] leading-[1.45] text-ink-2">
          <p className="font-medium text-ink">The email would contain this link</p>
          <Link href={`/reset-password?token=${sent.token}`} className="break-all text-primary hover:underline">
            /reset-password?token={sent.token}
          </Link>
        </div>
        <Button size="xl" variant="primary" onClick={() => setSent(null)}>
          Use a different email
        </Button>
      </AuthShell>
    );

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email on your account and we will send a link to set a new password."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const result = requestReset(email);
          if ("error" in result) return setError(result.error);
          setSent(result.link);
        }}
      >
        {error && <AuthError>{error}</AuthError>}
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="you@company.com"
          />
        </Field>
        <Button size="xl" variant="primary" type="submit" disabled={!email.trim()}>
          Send reset link
        </Button>
      </form>
    </AuthShell>
  );
}
