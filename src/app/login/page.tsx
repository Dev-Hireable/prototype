"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError, AuthShell, PasswordInput } from "@/components/portal/AuthShell";
import { Button, Field, Input } from "@/components/independent/ui";
import { DEMO_PASSWORD, HOME, signIn } from "@/lib/demo/auth";

/** OB-001 — sign in, land on the dashboard the account type belongs to. */
export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const result = signIn(email, password);
    if ("error" in result) return setError(result.error);
    router.push(HOME[result.account.role]);
  };

  return (
    <AuthShell
      title="Sign in to Hireable"
      subtitle="Trial Drives, objectives and payments — all in one place."
      footer={
        <>
          New to Hireable?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* OB-001 — one message for a wrong email or a wrong password; it never says which. */}
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
        <Field label="Password">
          <PasswordInput
            value={password}
            autoComplete="current-password"
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
            placeholder="Your password"
          />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-[13px] leading-[1.4] font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button size="xl" variant="primary" type="submit" disabled={!email.trim() || !password}>
          Sign in
        </Button>
      </form>

      {/* The demo accounts, so the prototype can actually be signed into. */}
      <div className="flex flex-col gap-1.5 rounded-lg bg-surface-2 p-4 text-[12.5px] leading-[1.45] text-ink-2">
        <p className="font-medium text-ink">Demo accounts</p>
        <p>alex@nairobisolutions.com — Team Builder</p>
        <p>juandelacruz@gmail.com — Independent</p>
        <p>admin@hireable.com — Admin</p>
        <p>
          Password for all three: <span className="font-medium text-ink">{DEMO_PASSWORD}</span>
        </p>
      </div>
    </AuthShell>
  );
}
