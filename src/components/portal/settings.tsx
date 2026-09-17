"use client";

import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button, Card, Checkbox, Field, Input, Select, Toast, useToast } from "@/components/independent/ui";
import { DEMO_PASSWORD, PASSWORD_RULES as AUTH_RULES } from "@/lib/demo/auth";
import { checkImage, IMAGE_TYPES, readImage } from "@/lib/team/data";

function SettingsHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
      {children}
    </h2>
  );
}

export type AccountSettingsValues = { first: string; last: string; email: string; phone: string; tz: string; lang: string };

export function AccountSettingsCard({
  initial,
  avatar,
  emailLabel,
  timeZoneOptions,
  languageOptions,
  accountType,
  onSave,
  onPhoto,
}: {
  initial: AccountSettingsValues;
  avatar: ReactNode;
  emailLabel: string;
  timeZoneOptions: readonly string[];
  languageOptions: readonly string[];
  /** TB-099 — shown read-only beside the editable fields. */
  accountType?: string;
  /** Lets the page push the saved name somewhere the rest of the app reads. */
  onSave?: (values: AccountSettingsValues) => void;
  /** TB-099 / IN-067 — given a handler, Change photo picks a real file instead of toasting. */
  onPhoto?: (dataUrl: string) => void;
}) {
  const [form, setForm] = useState(initial);
  /** TB-099 — the new address only takes effect once the code that went to it is entered. */
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [toast, setToast] = useToast();
  const set = (key: keyof AccountSettingsValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const file = useRef<HTMLInputElement>(null);

  return (
    <>
      <Card className="mx-auto flex w-[720px] flex-col gap-4 p-6">
        <SettingsHeading>Account</SettingsHeading>
        <div className="flex items-center gap-4">
          {avatar}
          <div className="flex min-w-0 flex-1 flex-col gap-1 leading-[1.4]">
            <p className="text-[13px] font-medium text-ink">Profile photo</p>
            <p className="text-[12px] text-ink-2">PNG or JPG, up to 5 MB.</p>
          </div>
          <input
            ref={file}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={async (event) => {
              const picked = event.target.files?.[0];
              event.target.value = "";
              if (!picked || !onPhoto) return;
              const problem = checkImage(picked);
              if (problem) return setToast(problem);
              onPhoto(await readImage(picked));
              setToast("Photo updated");
            }}
          />
          <Button size="sm" onClick={() => (onPhoto ? file.current?.click() : setToast("File picker opens here"))}>
            Change photo
          </Button>
        </div>
        <div className="flex gap-4">
          <Field label="First name" className="flex-1">
            <Input value={form.first} onChange={set("first")} />
          </Field>
          <Field label="Last name" className="flex-1">
            <Input value={form.last} onChange={set("last")} />
          </Field>
        </div>
        {accountType && (
          <Field label="Account type">
            <p className="flex h-11 items-center rounded-lg bg-surface-2 px-4 text-[14px] leading-[1.2] text-ink-2">{accountType}</p>
          </Field>
        )}
        <div className="flex items-center gap-3">
          <Field label={emailLabel} hint="A 6-digit code goes to the new address first." className="flex-1">
            <Input value={form.email} onChange={set("email")} type="email" />
          </Field>
          <Button
            size="lg"
            className="shrink-0"
            disabled={form.email === initial.email || !form.email.includes("@")}
            onClick={() => {
              setPending(form.email);
              setCode("");
              setToast(`Verification code sent to ${form.email}`);
            }}
          >
            Change email
          </Button>
        </div>
        {/* TB-099 — until this is confirmed, the address on the account is still the old one. */}
        {pending && (
          <div className="flex items-end gap-3 rounded-lg bg-surface-2 p-4">
            <Field label={`Enter the code sent to ${pending}`} hint="Any 6 digits work in this demo." className="flex-1">
              <Input value={code} inputMode="numeric" onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="123456" />
            </Field>
            <Button
              size="lg"
              variant="primary"
              disabled={code.length !== 6}
              onClick={() => {
                setPending(null);
                setToast("Email verified and updated");
              }}
            >
              Verify
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setForm((current) => ({ ...current, email: initial.email }));
                setPending(null);
              }}
            >
              Cancel
            </Button>
          </div>
        )}
        <Field label="Phone">
          <Input value={form.phone} onChange={set("phone")} />
        </Field>
        <div className="flex gap-4">
          <Field label="Time zone" className="flex-1">
            <Select options={timeZoneOptions} value={form.tz} onChange={set("tz")} />
          </Field>
          <Field label="Language" className="flex-1">
            <Select options={languageOptions} value={form.lang} onChange={set("lang")} />
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button size="lg" onClick={() => setForm(initial)}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!!pending}
            onClick={() => {
              onSave?.(form);
              setToast(pending ? "Verify the new email first" : "Changes saved");
            }}
          >
            Save changes
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

/** One list of rules for sign-up, reset and this form, plus the symbol this form asks for on top. */
const PASSWORD_RULES: readonly [string, (password: string) => boolean][] = [...AUTH_RULES, ["One symbol", (password: string) => /[^A-Za-z0-9]/.test(password)]];

export function PasswordSettingsCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [wrong, setWrong] = useState(false);
  const [toast, setToast] = useToast();
  const valid = PASSWORD_RULES.every(([, test]) => test(next)) && next === confirm && current.length > 0;

  return (
    <>
      <Card className="mx-auto flex w-[720px] flex-col gap-4 p-6">
        <SettingsHeading>Change password</SettingsHeading>
        <p className="max-w-[660px] text-[13px] leading-[1.4] text-ink-2">Use at least 8 characters with one uppercase letter, one number and one symbol. This is the same rule as sign-up.</p>
        <Field label="Current password" hint={`This demo account uses ${DEMO_PASSWORD}`}>
          <Input
            type="password"
            value={current}
            onChange={(event) => {
              setCurrent(event.target.value);
              setWrong(false);
            }}
          />
        </Field>
        {wrong && <p className="text-[13px] leading-[1.4] text-danger">That isn’t your current password. Check it and try again.</p>}
        <Field label="New password">
          <Input type="password" value={next} onChange={(event) => setNext(event.target.value)} placeholder="Enter a new password" />
        </Field>
        <ul className="flex flex-col gap-1.5 text-[13px] leading-[1.4]">
          {PASSWORD_RULES.map(([label, test]) => (
            <li key={label} className={`flex items-center gap-2 ${test(next) ? "text-ink" : "text-ink-2"}`}>
              <span className={`size-2 rounded-full ${test(next) ? "bg-ok" : "bg-border"}`} /> {label}
            </li>
          ))}
        </ul>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repeat the new password" />
        </Field>
        <p className="max-w-[660px] text-[12px] leading-[1.4] text-ink-2">Forgot your current password? Sign out and use Forgot password on the sign-in screen.</p>
        <div className="flex justify-end gap-3">
          <Button size="lg" onClick={() => { setNext(""); setConfirm(""); }}>
            Cancel
          </Button>
          <Button
            size="lg"
            variant="primary"
            disabled={!valid}
            onClick={() => {
              if (current !== DEMO_PASSWORD) return setWrong(true);
              setToast("Password updated");
              setCurrent("");
              setNext("");
              setConfirm("");
            }}
          >
            Update password
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

export type NotificationPreference = {
  key: string;
  title: string;
  body: string;
  app: boolean;
  email: boolean;
  appDisabled?: boolean;
  emailDisabled?: boolean;
};

export function NotificationPreferencesCard({ events }: { events: readonly NotificationPreference[] }) {
  const [prefs, setPrefs] = useState(() => events.map((event) => ({ ...event })));
  const [toast, setToast] = useToast();
  const toggle = (key: string, field: "app" | "email", value: boolean) => setPrefs((current) => current.map((event) => (event.key === key ? { ...event, [field]: value } : event)));

  return (
    <>
      <Card className="mx-auto flex w-[760px] flex-col gap-4 p-6">
        <SettingsHeading>Notification preferences</SettingsHeading>
        <p className="max-w-[700px] text-[13px] leading-[1.4] text-ink-2">Choose where you hear about each event. In-app notifications for offers and payments cannot be turned off.</p>
        <div className="flex items-center gap-4 border-b border-border py-2 text-[12px] leading-[1.4] font-medium text-ink-2">
          <span className="flex-1">Event</span>
          <span className="w-20 text-center">In-app</span>
          <span className="w-20 text-center">Email</span>
        </div>
        {prefs.map((event) => (
          <div key={event.key} className="flex items-center gap-4 border-b border-border py-2.5 leading-[1.4] whitespace-nowrap">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[14px] font-medium text-ink">{event.title}</p>
              <p className="text-[12px] text-ink-2">{event.body}</p>
            </div>
            <span className="flex h-6 w-20 items-center justify-center">
              <Checkbox checked={event.app} disabled={event.appDisabled} onChange={(value) => toggle(event.key, "app", value)} />
            </span>
            <span className="flex h-6 w-20 items-center justify-center">
              <Checkbox checked={event.email} disabled={event.emailDisabled} onChange={(value) => toggle(event.key, "email", value)} />
            </span>
          </div>
        ))}
        <div className="flex justify-end">
          <Button size="lg" variant="primary" onClick={() => setToast("Preferences saved")}>
            Save preferences
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

export function PaymentMethodRow({ brand, title, subtitle, actions }: { brand: ReactNode; title: ReactNode; subtitle: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-lg p-4 outline -outline-offset-1 outline-border">
      <span className="flex items-start rounded bg-surface-2 px-2.5 py-1.5">{brand}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-[14px] leading-[1.4] font-medium text-ink">{title}</span>
        <span className="text-[12px] leading-[1.4] text-ink-2">{subtitle}</span>
      </span>
      {actions && <div className="flex items-center gap-4">{actions}</div>}
    </div>
  );
}
