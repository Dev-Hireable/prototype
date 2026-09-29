"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError, AuthShell, PasswordInput } from "@/components/portal/auth-shell";
import { Button, Field, Input } from "@/components/portal/ui";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, landingFor, signIn } from "@/lib/demo/auth";

/** OB-001 — sign in, land on the dashboard the account type belongs to (by way of the quiz, the first time). */
export default function Login() {
  const { email, setEmail, password, setPassword, error, setError, submit, fillDemoAccount } = useLoginForm();

  return (
    <AuthShell title="Login to Hireable">
      <form
        className="flex flex-col gap-4 [@media(max-height:760px)]:gap-3"
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
        <Button size="xl" variant="primary" type="submit" disabled={!email.trim() || !password}>
          Sign in
        </Button>
      </form>

      {/* The demo accounts. Pick one and the form fills itself — nothing to copy across. */}
      <DemoAccountPicker selectedEmail={email} onPick={fillDemoAccount} />
    </AuthShell>
  );
}

/** The sign-in form's fields and its one error, signing in, and filling the form from a demo account. */
function useLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const result = signIn(email, password);
    if ("error" in result) return setError(result.error);
    router.push(landingFor(result.account.role));
  };

  const fillDemoAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  return { email, setEmail, password, setPassword, error, setError, submit, fillDemoAccount };
}

/** The demo accounts to sign in as, the one in the form marked. */
function DemoAccountPicker({ selectedEmail, onPick }: { selectedEmail: string; onPick: (email: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-2 p-4">
      <p className="text-[12.5px] leading-[1.45] font-medium text-ink">Sign in as</p>
      {DEMO_ACCOUNTS.map((a) => (
        <button
          key={a.email}
          type="button"
          onClick={() => onPick(a.email)}
          aria-pressed={selectedEmail === a.email}
          className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${selectedEmail === a.email ? "border-primary bg-white" : "border-transparent bg-white/70 hover:border-border hover:bg-white"}`}
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-[13px] leading-[1.3] font-medium text-ink">{a.name}</span>
            <span className="truncate text-[12px] leading-[1.3] text-ink-2">{a.email}</span>
          </span>
          <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-[11px] leading-[1.2] font-medium text-ink-2">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
