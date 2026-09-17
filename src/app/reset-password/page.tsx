"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthError, AuthShell, PasswordInput, PasswordRules } from "@/components/portal/AuthShell";
import { Button, Field, StatusDot } from "@/components/independent/ui";
import { PASSWORD_RULES, passwordOk, resetPassword } from "@/lib/demo/auth";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}

/** OB-004 — set a new password from the emailed link, then back to sign in. */
function ResetPassword() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (done)
    return (
      <AuthShell title="Password updated" subtitle="Your new password is set. Sign in with it to pick up where you left off.">
        <div className="flex items-center gap-2 rounded-lg bg-[#f3faf6] px-4 py-3">
          <StatusDot tone="ok">Password changed</StatusDot>
        </div>
        <Button size="xl" variant="primary" onClick={() => router.push("/login")}>
          Back to sign in
        </Button>
      </AuthShell>
    );

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Reset links work once and expire after 24 hours."
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
          const result = resetPassword(token, password);
          if ("error" in result) return setError(result.error);
          setDone(true);
          // OB-004 — the success message stands on its own before the redirect.
          setTimeout(() => router.push("/login"), 2500);
        }}
      >
        {error && <AuthError>{error}</AuthError>}
        <Field label="New password">
          <PasswordInput value={password} autoComplete="new-password" onChange={setPassword} placeholder="Create a new password" />
        </Field>
        <PasswordRules password={password} rules={PASSWORD_RULES} />
        <Field label="Confirm new password" error={confirm !== "" && confirm !== password ? "Both passwords have to match." : ""}>
          <PasswordInput value={confirm} autoComplete="new-password" onChange={setConfirm} placeholder="Repeat the new password" />
        </Field>
        <Button size="xl" variant="primary" type="submit" disabled={!passwordOk(password) || password !== confirm}>
          Set new password
        </Button>
      </form>
    </AuthShell>
  );
}
