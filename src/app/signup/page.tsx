"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError, AuthLink, AuthShell, PasswordInput, PasswordRules } from "@/components/portal/AuthShell";
import { Button, Field, Input, StatusDot } from "@/components/independent/ui";
import { emailOk, PASSWORD_RULES, passwordOk, signUp, type Role } from "@/lib/demo/auth";

type Step = "details" | "verify";
type SignUpRole = Exclude<Role, "admin">;

/** The two account types, as the toggle at the top of the form offers them. */
const ROLE_CHOICES = [
  ["independent", "I'm looking for work"],
  ["team", "I'm hiring"],
] as const;

/**
 * OB-002 / OB-003 — one sign-up flow for both account types. The two differ by a single field
 * (company name against job title) and by where the finished quiz lands, so they share a form
 * rather than being two copies of it.
 */
export default function SignUp() {
  const { role, step, name, setName, email, setEmail, password, setPassword, detail, setDetail, error, setError, chooseRole, createAccount } =
    useSignUpForm();

  const detailLabel = role === "team" ? "Company name" : "Job title";
  const ready = name.trim() !== "" && emailOk(email) && passwordOk(password) && detail.trim() !== "";

  if (step === "verify") return <VerifyEmailStep email={email} role={role} />;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Hire through a 30-day Trial Drive, or get hired through one."
      footer={<AuthLink prompt="Already have an account?" linkText="Login" href="/login" />}
    >
      <form
        className="flex flex-col gap-4 [@media(max-height:760px)]:gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          createAccount();
        }}
      >
        <RoleToggle role={role} onChoose={chooseRole} />
        {/* OB-002 / OB-003 — a duplicate email is refused with the reason. */}
        {error && <AuthError>{error}</AuthError>}
        <Field label="Full name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Juan Dela Cruz" />
        </Field>
        <Field label="Email" error={email.trim() !== "" && !emailOk(email) ? "That does not look like an email address." : ""}>
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
        <Field label={detailLabel}>
          <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={role === "team" ? "Nairobi Solutions Inc." : "Sales Manager"} />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} autoComplete="new-password" onChange={setPassword} placeholder="Create a password" />
        </Field>
        <PasswordRules password={password} rules={PASSWORD_RULES} />
        <Button size="xl" variant="primary" type="submit" disabled={!ready}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}

/** The sign-up form's fields, the step it's on, and creating the account from them. */
function useSignUpForm() {
  const [role, setRole] = useState<SignUpRole>("independent");
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");

  const chooseRole = (value: SignUpRole) => {
    setRole(value);
    setError("");
  };

  /** OB-002 / OB-003 — the account is created here; the emailed verification is the next step. */
  const createAccount = () => {
    const result = signUp({ email, password, name: name.trim(), role, detail: detail.trim() });
    if ("error" in result) return setError(result.error);
    setStep("verify");
  };

  return { role, step, name, setName, email, setEmail, password, setPassword, detail, setDetail, error, setError, chooseRole, createAccount };
}

/** Which account this is: one looking for work, or one hiring. */
function RoleToggle({ role, onChoose }: { role: SignUpRole; onChoose: (role: SignUpRole) => void }) {
  return (
    <div className="flex gap-2">
      {ROLE_CHOICES.map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-pressed={role === value}
          onClick={() => onChoose(value)}
          className={`h-11 flex-1 rounded-lg text-[13.5px] leading-[1.2] font-medium ${role === value ? "bg-primary text-white" : "border border-border bg-white text-ink hover:bg-surface-alt"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The step after the details: the email is verified, and the quiz is next. */
function VerifyEmailStep({ email, role }: { email: string; role: SignUpRole }) {
  const router = useRouter();

  return (
    <AuthShell title="Check your email" subtitle={`We sent a verification link to ${email}. Confirm it to secure the account — in this demo it is already confirmed for you.`}>
      <div className="flex items-center gap-2 rounded-lg bg-[#f3faf6] px-4 py-3">
        <StatusDot tone="ok">Email verified</StatusDot>
        <span className="text-[13px] leading-[1.4] text-ink-2">{email}</span>
      </div>
      {/* OB-002 / OB-003 — the quiz is a required step before the dashboard, not an optional one. It is
          the real app's onboarding, which finishes on the dashboard for this account's role. */}
      <Button size="xl" variant="primary" onClick={() => router.push(role === "team" ? "/onboarding/client" : "/onboarding/talent")}>
        Start the Work Style Quiz
      </Button>
      <p className="text-[12.5px] leading-[1.45] text-ink-2">One step left. The quiz takes about two minutes and generates the workplace tags on your profile.</p>
    </AuthShell>
  );
}
