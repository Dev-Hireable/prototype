"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ICONS } from "@/components/icons";
import { Input } from "@/components/portal/ui";

const Visible = ICONS.visibility;
const Hidden = ICONS.visibilityOff;

/**
 * OB-001 to OB-004 — the account screens, built to the same layout the live Hireable app uses
 * (apps/web/app/(auth)): a fixed #212121 sidebar carrying the white wordmark and the pillars
 * graphic, and a centred 480px column beside it. The sidebar drops away under `lg`, where the
 * form takes the whole width.
 *
 * The form controls are the prototype's own, so these screens still look like the rest of it.
 */
export function AuthShell({ title, subtitle, children, footer, width = 480 }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <div className="flex min-h-[calc(100dvh/var(--ui-scale))] w-full overflow-x-hidden bg-white">
      <aside className="fixed top-0 left-0 isolate hidden h-[calc(100dvh/var(--ui-scale))] w-[480px] flex-col items-start overflow-hidden bg-[#212121] p-14 lg:flex">
        <Link href="/" className="z-10 inline-flex shrink-0 items-center" aria-label="Hireable">
          <Image src="/hireable-wordmark-white.svg" alt="Hireable" width={164} height={26} loading="eager" draggable={false} unoptimized />
        </Link>
        {/* Decorative only: the pillars sit bottom-left, bleeding off the panel like the live app. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-14 z-0 h-[301px] w-[480px] overflow-hidden bg-contain bg-left-bottom bg-no-repeat"
          style={{ backgroundImage: "url(/auth-pillars.svg)" }}
        />
      </aside>

      {/* Spacer so the centred column measures against what is left, not the whole viewport. */}
      <div className="hidden w-[480px] shrink-0 lg:block" />

      {/* On a short window — a 14" laptop, 600–760px tall once the browser takes its share — the
          padding and gaps tighten and the heading steps down, so the form fits without scrolling. */}
      <main className="relative flex flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14 [@media(max-height:760px)]:!py-5">
        <div className="flex w-full flex-col gap-6 sm:gap-8 [@media(max-height:760px)]:!gap-4" style={{ maxWidth: width }}>
          <div className="flex flex-col items-center gap-3 sm:gap-4 [@media(max-height:760px)]:!gap-2">
            <Image src="/hireable-mark.svg" alt="" width={44} height={44} className="size-11 [@media(max-height:760px)]:size-9" unoptimized />
            <h1 className="text-center text-[24px] leading-[1.3] font-semibold tracking-[-0.2px] text-balance text-ink sm:text-[30px] [@media(max-height:760px)]:!text-[24px]">{title}</h1>
            {subtitle && <p className="text-center text-[14px] leading-[1.45] text-balance text-ink-2">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && <div className="mt-6 flex h-5 [@media(max-height:760px)]:mt-4 items-center justify-center gap-1 text-[14px] leading-[1.2] tracking-[0.2px]">{footer}</div>}
      </main>
    </div>
  );
}

/** The footer pattern from the live app: prompt in ink, the action in brand blue. */
export function AuthLink({ prompt, linkText, href }: { prompt: string; linkText: string; href: string }) {
  return (
    <>
      <span className="text-ink">{prompt}</span>
      <Link href={href} className="rounded-lg font-medium text-primary hover:underline">
        {linkText}
      </Link>
    </>
  );
}

/**
 * OB-001 — a password field with the show/hide toggle the AC asks for. The eye shows the current
 * state, the live app's way round (Web-App's PasswordInputField): struck through while the
 * password is hidden, open once it's showing.
 */
export function PasswordInput({ value, onChange, placeholder, autoComplete }: { value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string }) {
  const [shown, setShown] = useState(false);
  const Eye = shown ? Visible : Hidden;
  return (
    <span className="relative flex">
      <Input type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="pr-11" />
      {/* One name plus aria-pressed: a toggle announces its own state, so the label doesn't flip with it. */}
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label="Show password"
        aria-pressed={shown}
        className="absolute top-0 right-0 flex size-11 items-center justify-center rounded-lg text-ink-2 hover:text-ink"
      >
        <Eye size={20} aria-hidden />
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
