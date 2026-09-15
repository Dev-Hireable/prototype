"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Page, Select, Toast, useToast } from "@/components/independent/ui";
import { Avatar, CardHeading } from "@/components/team/ui";
import { ME } from "@/lib/team/data";

const INITIAL = { first: "Alex", last: "Rivera", email: "alex@nairobisolutions.com", phone: "+63 917 555 0142", tz: "(GMT+8) Manila", lang: "English" };

/** Figma "Settings / Account" (Team Builder) — identical frame to the Independent one. */
export default function AccountSettings() {
  const [form, setForm] = useState(INITIAL);
  const [toast, setToast] = useToast();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Page title="Settings">
      <Card className="mx-auto flex w-[720px] flex-col gap-4 p-6">
        <CardHeading>Account</CardHeading>
        <div className="flex items-center gap-4">
          <Avatar src={ME.avatar} size={64} />
          <div className="flex min-w-0 flex-1 flex-col gap-1 leading-[1.4]">
            <p className="text-[13px] font-medium text-ink">Profile photo</p>
            <p className="text-[12px] text-ink-2">PNG or JPG, up to 5 MB.</p>
          </div>
          <Button size="sm" onClick={() => setToast("File picker opens here")}>
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
        <div className="flex items-center gap-3">
          <Field label="Work email" hint="A 6-digit code goes to the new address first." className="flex-1">
            <Input value={form.email} onChange={set("email")} type="email" />
          </Field>
          <Button size="lg" className="shrink-0" onClick={() => setToast(`Verification code sent to ${form.email}`)}>
            Change email
          </Button>
        </div>
        <Field label="Phone">
          <Input value={form.phone} onChange={set("phone")} />
        </Field>
        <div className="flex gap-4">
          <Field label="Time zone" className="flex-1">
            <Select options={["(GMT+8) Manila", "(GMT-5) New York", "(GMT+0) London"]} value={form.tz} onChange={set("tz")} />
          </Field>
          <Field label="Language" className="flex-1">
            <Select options={["English", "Filipino"]} value={form.lang} onChange={set("lang")} />
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button size="lg" onClick={() => setForm(INITIAL)}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={() => setToast("Changes saved")}>
            Save changes
          </Button>
        </div>
      </Card>
      <Toast message={toast} onClose={() => setToast(null)} />
    </Page>
  );
}
