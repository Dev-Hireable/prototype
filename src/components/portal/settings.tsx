"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Button, Card, Checkbox, Field, Input, Select, Toast } from "@/components/portal/ui";
import { DEMO_PASSWORD, PASSWORD_RULES as AUTH_RULES } from "@/lib/demo/auth";
import { ImagePicker } from "@/components/portal/profile-editor";
import { TimeZonePicker, useDeviceTimeZone } from "@/components/portal/time-zone-picker";
import { ICONS } from "@/components/icons";
import { Tip } from "@/components/portal/tip";
import { useToast, type SetToast } from "@/lib/portal/toast";
import { checkImage, IMAGE_MAX_MB, readImage } from "@/lib/portal/profile-fields";

function SettingsHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-[18px] leading-[1.5] font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 14' }}>
      {children}
    </h2>
  );
}

export type AccountSettingsValues = { first: string; last: string; email: string; phone: string; tz: string; lang: string };

/** What each portal's settings page gives its account card. */
export type AccountSettingsCardProps = {
  initial: AccountSettingsValues;
  avatar: ReactNode;
  emailLabel: string;
  languageOptions: readonly string[];
  /** TB-099 — shown read-only beside the editable fields. */
  accountType?: string;
  /** Lets the page push the saved name somewhere the rest of the app reads. */
  onSave?: (values: AccountSettingsValues) => void;
  /** TB-099 / IN-067 — given a handler, Change photo picks a real file instead of toasting. */
  onPhoto?: (dataUrl: string) => void;
};

/**
 * The account card, with its toast kept outside the form. The form is keyed on the saved values:
 * they arrive after hydration and the form copies `initial` into state once, so without the key it
 * keeps showing the seed. A save that changes them remounts the form, and the toast out here still
 * says it was saved.
 */
export function AccountSettingsCard(props: AccountSettingsCardProps) {
  const [toast, setToast] = useToast();
  return (
    <>
      <AccountForm key={Object.values(props.initial).join("|")} {...props} onToast={setToast} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/** The account's photo and fields, with Cancel and Save; what they did is said in the card's toast. */
function AccountForm({ initial, avatar, emailLabel, languageOptions, accountType, onSave, onPhoto, onToast }: AccountSettingsCardProps & { onToast: SetToast }) {
  const [form, setForm] = useState(initial);
  /** TB-099 — the new address only takes effect once the code that went to it is entered. */
  const [pending, setPending] = useState<string | null>(null);
  const set = (key: keyof AccountSettingsValues) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return (
    <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6">
      <SettingsHeading>Account</SettingsHeading>
      {/* The same photo control as both profiles (ImagePicker): the camera on the photo's corner. */}
      <PhotoField avatar={avatar} onPhoto={onPhoto} onToast={onToast} />
      {/* TB-099 / IN-067 — the name is the account's legal name: shown here, changed only through support. */}
      <ReadOnlyField label="Full name" hint="Contact support to change your name." locked>
        {`${form.first} ${form.last}`.trim()}
      </ReadOnlyField>
      {accountType && <ReadOnlyField label="Account type">{accountType}</ReadOnlyField>}
      <EmailChange label={emailLabel} value={form.email} saved={initial.email} onChange={(email) => setForm((current) => ({ ...current, email }))} pending={pending} onPending={setPending} onToast={onToast} />
      <Field label="Phone">
        <Input value={form.phone} onChange={set("phone")} />
      </Field>
      <div className="flex gap-4 max-sm:flex-col">
        <TimeZoneField value={form.tz} onChange={(tz) => setForm((current) => ({ ...current, tz }))} />
        <Field label="Language" className="flex-1">
          <Select options={languageOptions} value={form.lang} onChange={set("lang")} />
        </Field>
      </div>
      <CardActions
        submit="Save changes"
        disabled={!!pending}
        onCancel={() => setForm(initial)}
        onSubmit={() => {
          onSave?.(form);
          onToast(pending ? "Verify the new email first" : "Changes saved", pending ? "danger" : "success");
        }}
      />
    </Card>
  );
}

/** A value the account shows but this form doesn't change: the name (locked, with how to change it) and the account type. */
function ReadOnlyField({ label, hint, locked = false, children }: { label: string; hint?: string; locked?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">{label}</span>
      <p className="flex h-11 items-center gap-2 rounded-lg bg-surface-2 px-4 text-[14px] leading-[1.2] text-ink-2">
        <span className="min-w-0 flex-1 truncate">{children}</span>
        {locked && <ICONS.lock size={16} aria-label="Locked" className="shrink-0" />}
      </p>
      {hint && <span className="text-[14px] leading-[1.2] tracking-[0.2px] text-ink-2">{hint}</span>}
    </div>
  );
}

/**
 * TB-099 / IN-067 — the time zone follows this device unless it's set by hand. A saved "" is
 * automatic, so interview times read in the viewer's local time without anyone picking one.
 */
function TimeZoneField({ value, onChange }: { value: string; onChange: (tz: string) => void }) {
  const device = useDeviceTimeZone();
  const auto = value === "";
  return (
    <div className="flex flex-1 flex-col gap-2">
      <Field label="Time zone">{auto ? <p className="flex h-11 items-center rounded-lg bg-surface-2 px-4 text-[14px] leading-[1.2] text-ink-2">{device}</p> : <TimeZonePicker value={value} onChange={onChange} />}</Field>
      <Checkbox checked={auto} onChange={(on) => onChange(on ? "" : device)}>
        Set automatically from this device
      </Checkbox>
    </div>
  );
}

/** The account's photo: the shared ImagePicker, with what it takes beside it. A picked file is checked and read here. */
function PhotoField({ avatar, onPhoto, onToast }: { avatar: ReactNode; onPhoto?: (dataUrl: string) => void; onToast: SetToast }) {
  return (
    <div className="flex items-center gap-4">
      <ImagePicker
        image={avatar}
        label={`Change photo — JPG or PNG, up to ${IMAGE_MAX_MB}MB`}
        onPick={async (picked) => {
          if (!picked) return;
          if (!onPhoto) return onToast("File picker opens here", "info");
          const problem = checkImage(picked);
          if (problem) return onToast(problem, "danger");
          onPhoto(await readImage(picked));
          onToast("Photo updated");
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 leading-[1.4]">
        <p className="text-[13px] font-medium text-ink">Profile photo</p>
        <p className="text-[12px] text-ink-2">JPG or PNG, up to {IMAGE_MAX_MB}MB. Use the camera on the photo to change it.</p>
      </div>
    </div>
  );
}

/**
 * TB-099 — the account's email. Change email sends a 6-digit code to the address in the field; it
 * becomes the account's (`pending` clears) once that code is entered, and Cancel puts the saved one back.
 */
function EmailChange({ label, value, saved, onChange, pending, onPending, onToast }: {
  label: string;
  /** The address in the field, and the one on the account. */
  value: string;
  saved: string;
  onChange: (email: string) => void;
  /** The new address waiting on its code. */
  pending: string | null;
  onPending: (email: string | null) => void;
  onToast: SetToast;
}) {
  const [code, setCode] = useState("");
  /** When the code now in force was sent: it lasts CODE_MINUTES. */
  const [sentAt, setSentAt] = useState(0);
  const send = (address: string) => {
    setCode("");
    setSentAt(Date.now());
    onToast(`Verification code sent to ${address}`);
  };
  return (
    <>
      <div className="flex items-end gap-3">
        <Field label={label} hint="Type a new email, then select Change email. We'll send a 6-digit code to it." className="flex-1">
          <Input value={value} onChange={(event) => onChange(event.target.value)} type="email" />
        </Field>
        <Button
          size="lg"
          className="shrink-0"
          disabled={value === saved || !value.includes("@")}
          onClick={() => {
            onPending(value);
            send(value);
          }}
        >
          Change email
        </Button>
      </div>
      {/* TB-099 — until this is confirmed, the address on the account is still the old one. */}
      {pending && (
        <VerifyEmail
          address={pending}
          code={code}
          sentAt={sentAt}
          onCode={setCode}
          onResend={() => send(pending)}
          onVerify={() => {
            onPending(null);
            onToast("Email verified and updated");
          }}
          onCancel={() => {
            onChange(saved);
            onPending(null);
          }}
        />
      )}
    </>
  );
}

/** How long an emailed code lasts. */
const CODE_MINUTES = 10;

/**
 * Why a code can't be used: it's past CODE_MINUTES, or it's wrong. With no mail server, every code is
 * accepted but 000000, which stands in for a mistyped one.
 */
function codeProblem(code: string, sentAt: number): string | null {
  if (Date.now() - sentAt > CODE_MINUTES * 60_000) return "That code has expired. Resend code to get a new one.";
  if (code === "000000") return "That code isn't right. Check the email and try again.";
  return null;
}

/** Under the email while a new address waits: the code sent to it, Verify, Cancel, Resend, and why a code was turned down. */
function VerifyEmail({ address, code, sentAt, onCode, onResend, onVerify, onCancel }: {
  address: string;
  code: string;
  sentAt: number;
  onCode: (code: string) => void;
  onResend: () => void;
  onVerify: () => void;
  onCancel: () => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-2 p-4">
      <div className="flex items-end gap-3">
        <Field label={`Enter the code sent to ${address}`} error={problem ?? undefined} className="flex-1">
          <Input
            value={code}
            inputMode="numeric"
            onChange={(event) => {
              setProblem(null);
              onCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6));
            }}
          />
        </Field>
        <Button size="lg" variant="primary" disabled={code.length !== 6} onClick={() => {
            const turnedDown = codeProblem(code, sentAt);
            setProblem(turnedDown);
            if (!turnedDown) onVerify();
          }}
        >
          Verify
        </Button>
        <Button size="lg" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p className="text-[13px] leading-[1.4] text-ink-2">
        Enter the 6-digit code. Didn&apos;t get it?{" "}
        <button type="button" onClick={() => (setProblem(null), onResend())} className="font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
          Resend code
        </button>
      </p>
    </div>
  );
}

/** A settings card's foot: Cancel, then the card's own action. */
function CardActions({ submit, disabled, onCancel, onSubmit }: { submit: string; disabled: boolean; onCancel: () => void; onSubmit: () => void }) {
  return (
    <div className="flex justify-end gap-3">
      <Button size="lg" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="lg" variant="primary" disabled={disabled} onClick={onSubmit}>
        {submit}
      </Button>
    </div>
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
      <Card className="mx-auto flex w-full max-w-[720px] flex-col gap-4 p-6">
        <SettingsHeading>Change password</SettingsHeading>
        <Field label="Current password">
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
        <CardActions
          submit="Update password"
          disabled={!valid}
          onCancel={() => {
            setNext("");
            setConfirm("");
          }}
          onSubmit={() => {
            if (current !== DEMO_PASSWORD) return setWrong(true);
            setToast("Password updated");
            setCurrent("");
            setNext("");
            setConfirm("");
          }}
        />
      </Card>
      <Toast toast={toast} onClose={() => setToast(null)} />
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
      <Card className="mx-auto flex w-full max-w-[760px] flex-col gap-4 p-6">
        <SettingsHeading>Notification preferences</SettingsHeading>
        <p className="max-w-[700px] text-[13px] leading-[1.4] text-ink-2">Choose how you hear about each event. Some offer and payment alerts are always on.</p>
        <div className="flex items-center gap-4 border-b border-border py-2 text-[12px] leading-[1.4] font-medium text-ink-2">
          <span className="flex-1">Event</span>
          <span className="w-20 text-center">In-app</span>
          <span className="w-20 text-center">Email</span>
        </div>
        {prefs.map((event) => (
          <div key={event.key} className="flex items-center gap-4 border-b border-border py-2.5 leading-[1.4]">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[14px] font-medium text-ink">{event.title}</p>
              <p className="text-[12px] text-ink-2">{event.body}</p>
            </div>
            <PreferenceBox checked={event.app} locked={event.appDisabled} label={`${event.title} in-app`} onChange={(value) => toggle(event.key, "app", value)} />
            <PreferenceBox checked={event.email} locked={event.emailDisabled} label={`${event.title} by email`} onChange={(value) => toggle(event.key, "email", value)} />
          </div>
        ))}
        <div className="flex justify-end">
          <Button size="lg" variant="primary" onClick={() => setToast("Preferences saved")}>
            Save preferences
          </Button>
        </div>
      </Card>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/** One box in the preferences table; one that's always on shows a lock and says so on hover. */
function PreferenceBox({ checked, locked, label, onChange }: { checked: boolean; locked?: boolean; label: string; onChange: (on: boolean) => void }) {
  if (locked)
    return (
      <Tip label="Always on">
        <span role="img" aria-label={`${label}: always on`} className="flex h-6 w-20 items-center justify-center text-ink-2">
          <ICONS.lock size={18} aria-hidden />
        </span>
      </Tip>
    );
  return (
    <span className="flex h-6 w-20 items-center justify-center">
      <Checkbox checked={checked} onChange={onChange}>
        <span className="sr-only">{label}</span>
      </Checkbox>
    </span>
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
