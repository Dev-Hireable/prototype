"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthError, AuthShell, PasswordInput, PasswordRules } from "@/components/portal/AuthShell";
import { Button, Field, Input, StatusDot } from "@/components/independent/ui";
import { emptyQuiz, quizComplete, WorkStyleQuiz, type QuizState } from "@/components/portal/WorkStyleQuiz";
import { emailOk, HOME, PASSWORD_RULES, passwordOk, seedPersisted, signUp, type Role } from "@/lib/demo/auth";
import { tagsFor } from "@/lib/independent/data";

type Step = "details" | "verify" | "quiz";

/**
 * OB-002 / OB-003 — one sign-up flow for both account types. The two differ by a single field
 * (company name against job title) and by where the finished quiz lands, so they share a form
 * rather than being two copies of it.
 */
export default function SignUp() {
  const router = useRouter();
  const [role, setRole] = useState<Exclude<Role, "admin">>("independent");
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<QuizState>(emptyQuiz());

  const detailLabel = role === "team" ? "Company name" : "Job title";
  const ready = name.trim() !== "" && emailOk(email) && passwordOk(password) && detail.trim() !== "";

  /** OB-002 / OB-003 — the account is created here; the emailed verification is the next step. */
  const createAccount = () => {
    const result = signUp({ email, password, name: name.trim(), role, detail: detail.trim() });
    if ("error" in result) return setError(result.error);
    setStep("verify");
  };

  /**
   * OB-002 / OB-003 — the quiz is the gate: the dashboard is only reachable once it is answered,
   * and the answers become the workplace tags the other side sees.
   */
  const finish = () => {
    const answers = quiz.answers.map((a) => a ?? 3);
    if (role === "independent") {
      seedPersisted("ind.workStyle", answers);
    } else {
      // A Team Builder's tags sit on the company profile the independents read.
      seedPersisted("team.companyTags", tagsFor(answers));
    }
    router.push(HOME[role]);
  };

  if (step === "quiz")
    return (
      <AuthShell width={560} title="Work Style Quiz" subtitle="Six questions. They set the workplace tags on your profile and the match scores you see — you can retake it later.">
        <WorkStyleQuiz state={quiz} onChange={setQuiz} />
        <div className="flex flex-col gap-2">
          <Button size="xl" variant="primary" disabled={!quizComplete(quiz)} onClick={finish}>
            Finish and open my dashboard
          </Button>
          {!quizComplete(quiz) && <p className="text-center text-[12.5px] leading-[1.4] text-ink-2">Answer all six to continue — the quiz is required before your dashboard opens.</p>}
        </div>
      </AuthShell>
    );

  if (step === "verify")
    return (
      <AuthShell title="Check your email" subtitle={`We sent a verification link to ${email}. Confirm it to secure the account — in this demo it is already confirmed for you.`}>
        <div className="flex items-center gap-2 rounded-lg bg-[#f3faf6] px-4 py-3">
          <StatusDot tone="ok">Email verified</StatusDot>
          <span className="text-[13px] leading-[1.4] text-ink-2">{email}</span>
        </div>
        {/* OB-002 / OB-003 — the quiz is a required step before the dashboard, not an optional one. */}
        <Button size="xl" variant="primary" onClick={() => setStep("quiz")}>
          Start the Work Style Quiz
        </Button>
        <p className="text-[12.5px] leading-[1.45] text-ink-2">One step left. The quiz takes about two minutes and generates the workplace tags on your profile.</p>
      </AuthShell>
    );

  return (
    <AuthShell
      title="Create your account"
      subtitle="Hire through a 30-day Trial Drive, or get hired through one."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          createAccount();
        }}
      >
        <div className="flex gap-2">
          {(
            [
              ["independent", "I'm looking for work"],
              ["team", "I'm hiring"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => {
                setRole(value);
                setError("");
              }}
              className={`h-11 flex-1 rounded-lg text-[13.5px] leading-[1.2] font-medium ${role === value ? "bg-primary text-white" : "border border-border bg-white text-ink hover:bg-surface-alt"}`}
            >
              {label}
            </button>
          ))}
        </div>
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
