"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Input } from "@/components/independent/ui";

/** OB-001 to OB-004 — one centred card for every account screen, so they read as one flow. */
export function AuthShell({ title, subtitle, children, footer, width = 460 }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6 bg-surface-2 px-6 py-12">
      <Link href="/" aria-label="Hireable">
        <Image src="/hireable-logo.svg" alt="Hireable" width={701} height={140} priority unoptimized className="h-7 w-auto" />
      </Link>
      <div className="flex w-full flex-col gap-5 rounded-2xl bg-white p-8 shadow-[0_8px_24px_rgba(26,31,46,0.08)]" style={{ maxWidth: width }}>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[24px] leading-[1.4] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
            {title}
          </h1>
          <p className="text-[13.5px] leading-[1.45] text-ink-2">{subtitle}</p>
        </div>
        {children}
      </div>
      {footer && <p className="text-[13px] leading-[1.4] text-ink-2">{footer}</p>}
    </main>
  );
}

/** OB-001 — a password field with the show/hide toggle the AC asks for. */
export function PasswordInput({ value, onChange, placeholder, autoComplete }: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative flex">
      <Input type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="!pr-20" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-pressed={shown}
        className="absolute top-0 right-3 flex h-11 items-center gap-1 text-[12.5px] leading-[1.2] font-medium text-ink-2 hover:text-ink"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </span>
  );
}

/** The password requirements, lighting up as they are met (OB-002 / OB-003 / OB-004). */
export function PasswordRules({ password, rules }: { password: string; rules: readonly [string, (p: string) => boolean][] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] leading-[1.4]">
      {rules.map(([label, test]) => (
        <li key={label} className={`flex items-center gap-1.5 ${test(password) ? "text-ink" : "text-ink-2"}`}>
          <span className={`size-2 rounded-full ${test(password) ? "bg-ok" : "bg-border"}`} /> {label}
        </li>
      ))}
    </ul>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-[#fdf1f0] px-4 py-3 text-[13px] leading-[1.45] text-danger">
      {children}
    </p>
  );
}
