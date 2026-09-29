import type { Dispatch, SetStateAction } from "react";
import { Button, Checkbox, Field, Input, Modal, Pills } from "@/components/portal/ui";
import { DatePicker } from "@/components/portal/date-picker";
import { fromISODate, isoDay, startOfToday } from "@/lib/portal/dates";
import { rateAmount } from "@/lib/demo/disputes";
import { FT_BENEFITS, JOB_TYPE_LABEL, type OngoingType } from "@/lib/contract/job-types";
import type { HireForm } from "../_lib/forms";

type Offer = { type: OngoingType; salary: string; start: string; benefits: string[]; hours?: number };

/** TB-072 — after an evaluated trial: a full-time or a part-time role, on the same engagement. */
export function HireDialog({ open, first, hire, setHire, onClose, onSend }: { open: boolean; first: string; hire: HireForm; setHire: Dispatch<SetStateAction<HireForm>>; onClose: () => void; onSend: (offer: Offer) => void }) {
  const hours = Number(hire.hours);
  const hoursOk = Number.isInteger(hours) && hours >= 1 && hours <= 40;
  const ready = rateAmount(hire.salary) > 0 && !!hire.start.trim() && (hire.type === "full-time" || hoursOk);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Hire ${first} after the trial`}
      description={`Pre-filled from their trial. Escrow closes and pay is charged monthly once they accept. If ${first} hasn't answered by the start date, the offer expires.`}
      footer={
        <>
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!ready} onClick={() => onSend({ type: hire.type, salary: hire.salary, start: hire.start, benefits: hire.benefits, hours: hire.type === "part-time" ? hours : undefined })}>
            Send {JOB_TYPE_LABEL[hire.type].toLowerCase()} offer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Pills
          aria-label="Kind of role"
          value={hire.type}
          onChange={(type) => setHire((h) => ({ ...h, type }))}
          options={[
            { value: "full-time", label: "Full-time" },
            { value: "part-time", label: "Part-time" },
          ]}
        />
        <div className="flex gap-3">
          <Field label={hire.type === "full-time" ? "Salary (USD / month)" : "Rate (USD / month)"} className="flex-1">
            <Input value={hire.salary} inputMode="decimal" onChange={(e) => setHire((h) => ({ ...h, salary: e.target.value.replace(/[^0-9.,]/g, "") }))} />
          </Field>
          <Field label="Start date" className="flex-1">
            <DatePicker value={fromISODate(hire.start)} onChange={(d) => setHire((h) => ({ ...h, start: d ? isoDay(d) : "" }))} disabled={{ before: startOfToday() }} />
          </Field>
        </div>
        {hire.type === "part-time" ? (
          <Field label="Hours a week" error={hire.hours.trim() && !hoursOk ? "Enter whole hours between 1 and 40." : undefined}>
            <Input value={hire.hours} inputMode="numeric" onChange={(e) => setHire((h) => ({ ...h, hours: e.target.value.replace(/[^0-9]/g, "") }))} className="!w-[160px]" />
          </Field>
        ) : (
          <Field label="Exclusive benefits (optional)">
            <div className="flex flex-col gap-2">
              {FT_BENEFITS.map((b) => (
                <Checkbox key={b} checked={hire.benefits.includes(b)} onChange={(on) => setHire((h) => ({ ...h, benefits: on ? [...h.benefits, b] : h.benefits.filter((x) => x !== b) }))}>
                  {b}
                </Checkbox>
              ))}
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
}
