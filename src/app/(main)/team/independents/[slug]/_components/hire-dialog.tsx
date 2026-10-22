import type { Dispatch, SetStateAction } from "react";
import { Button, Checkbox, Field, Input, Modal, Pills } from "@/components/portal/ui";
import { DatePicker } from "@/components/portal/date-picker";
import { fromISODate, isoDay, startOfToday } from "@/lib/portal/dates";
import { formatMoney } from "@/lib/portal/money";
import { FT_BENEFITS, JOB_TYPE_LABEL, type OngoingType } from "@/lib/contract/job-types";
import { hireBlock, hoursValid, type HireForm } from "../_lib/forms";

type Offer = { type: OngoingType; salary: string; start: string; benefits: string[]; hours?: number };

/**
 * TB-072 — after an evaluated trial: a full-time or a part-time role, on the same engagement. The pay,
 * the start date and a part-time role's hours are required; until they're in, the line beside Send
 * says which is missing.
 */
export function HireDialog({ open, first, hire, setHire, onClose, onSend }: { open: boolean; first: string; hire: HireForm; setHire: Dispatch<SetStateAction<HireForm>>; onClose: () => void; onSend: (offer: Offer) => void }) {
  const block = hireBlock(hire);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Hire ${first} after the trial`}
      description={`${first}'s trial details are filled in. You are charged monthly once ${first} accepts. The offer expires on the start date.`}
      footer={
        <>
          {block && <span className="mr-auto self-center text-[12.5px] leading-[1.4] text-ink-2">{block}</span>}
          <Button size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" disabled={!!block} title={block} onClick={() => onSend({ type: hire.type, salary: hire.salary, start: hire.start, benefits: hire.benefits, hours: hire.type === "part-time" ? Number(hire.hours) : undefined })}>
            Send {JOB_TYPE_LABEL[hire.type].toLowerCase()} offer
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Pills
          size="lg"
          aria-label="Kind of role"
          value={hire.type}
          onChange={(type) => setHire((h) => ({ ...h, type }))}
          options={[
            { value: "full-time", label: "Full-time" },
            { value: "part-time", label: "Part-time" },
          ]}
        />
        <div className="flex gap-3">
          {/* One label on both kinds of role: the amount is the pay, by the month. */}
          <Field label="Pay (per month)" required className="flex-1">
            {/* Commas as it's typed, like the create-role wizard's pay: "4000" reads "4,000". */}
            <Input required value={hire.salary} inputMode="decimal" onChange={(e) => setHire((h) => ({ ...h, salary: formatMoney(e.target.value) }))} />
          </Field>
          <Field label="Start date" required className="flex-1">
            <DatePicker value={fromISODate(hire.start)} onChange={(d) => setHire((h) => ({ ...h, start: d ? isoDay(d) : "" }))} disabled={{ before: startOfToday() }} />
          </Field>
        </div>
        {hire.type === "part-time" ? (
          <Field label="Hours a week" required error={hire.hours.trim() && !hoursValid(hire.hours) ? "Enter whole hours between 1 and 40." : undefined}>
            <Input required value={hire.hours} inputMode="numeric" onChange={(e) => setHire((h) => ({ ...h, hours: e.target.value.replace(/[^0-9]/g, "") }))} className="!w-[160px]" />
          </Field>
        ) : (
          <BenefitsField hire={hire} setHire={setHire} />
        )}
      </div>
    </Modal>
  );
}

/** A full-time offer's benefits, each ticked on or off; all of them to start with. */
function BenefitsField({ hire, setHire }: { hire: HireForm; setHire: Dispatch<SetStateAction<HireForm>> }) {
  return (
    <Field label="Benefits (optional)">
      <div className="flex flex-col gap-2">
        {FT_BENEFITS.map((b) => (
          <Checkbox key={b} checked={hire.benefits.includes(b)} onChange={(on) => setHire((h) => ({ ...h, benefits: on ? [...h.benefits, b] : h.benefits.filter((x) => x !== b) }))}>
            {b}
          </Checkbox>
        ))}
      </div>
    </Field>
  );
}
