"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Page, Toast, useToast } from "@/components/independent/ui";
import { CardHeading } from "@/components/team/ui";

const RULES: [string, (p: string) => boolean][] = [
  ["At least 8 characters", (p) => p.length >= 8],
  ["One uppercase letter", (p) => /[A-Z]/.test(p)],
  ["One number", (p) => /\d/.test(p)],
  ["One symbol", (p) => /[^A-Za-z0-9]/.test(p)],
];

/** Figma "Settings / Security (change password)". */
export default function Security() {
  const [current, setCurrent] = useState("••••••••••");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [toast, setToast] = useToast();
  const ok = RULES.every(([, t]) => t(next)) && next === confirm && current.length > 0;

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-[720px] flex-col gap-4 p-6">
        <CardHeading>Change password</CardHeading>
        <p className="max-w-[660px] text-[13px] leading-[1.4] text-ink-2">Use at least 8 characters with one uppercase letter, one number and one symbol. This is the same rule as sign-up.</p>
        <Field label="Current password">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="New password">
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Enter a new password" />
        </Field>
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[1.4]">
          {RULES.map(([label, test]) => (
            <li key={label} className={`flex items-center gap-2 ${test(next) ? "text-ink" : "text-ink-2"}`}>
              <span className={`size-2 rounded-full ${test(next) ? "bg-ok" : "bg-border"}`} /> {label}
            </li>
          ))}
        </ul>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat the new password" />
        </Field>
        <p className="max-w-[660px] text-[12px] leading-[1.4] text-ink-2">Forgot your current password? Sign out and use Forgot password on the sign-in screen.</p>
        <div className="flex justify-end gap-3">
          <Button size="lg" onClick={() => { setNext(""); setConfirm(""); }}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!ok} onClick={() => { setToast("Password updated"); setNext(""); setConfirm(""); }}>
            Update password
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
