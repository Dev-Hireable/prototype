"use client";

import { useState } from "react";
import { Button, Field, Input, Modal, Textarea } from "@/components/independent/ui";
import { SuggestTasks } from "@/components/independent/SuggestTasks";
import type { DealOffer } from "@/lib/demo/deal";
import type { TaskSuggestion } from "@/lib/demo/suggestions";
import { planWeeks } from "@/lib/demo/tasks";
import { checkRequest, requestOfferChanges } from "@/lib/independent/offer";
import { NOTE_MAX } from "@/lib/work/model";

/**
 * IN-092 — asking for changes to the revision being read, before signing: a change to any of its
 * tasks (its name or due week), a task removed or added — each with its reason — the rate they'd sign
 * for, and a note. The company answers each in its next revision; nothing changes until then.
 */
export function RequestChanges({ open, offer, revision, company, contact, days, onClose, onSent }: { open: boolean; offer: DealOffer; revision: number; company: string; contact: string; days: number; onClose: () => void; onSent: (message: string) => void }) {
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = { revision, note, suggestions, rate: rate.trim() || undefined };
  const problem = checkRequest(request, offer.tasks);
  const close = () => {
    setTried(false);
    setError(null);
    onClose();
  };
  const send = () => {
    setTried(true);
    if (problem) return;
    const done = requestOfferChanges(request);
    if (!done.ok) return setError(done.error);
    setSuggestions([]);
    setRate("");
    setNote("");
    close();
    onSent(`Asked ${contact} for changes to revision ${revision}`);
  };
  return (
    <Modal
      open={open}
      onClose={close}
      width={720}
      title={`Ask for changes to revision ${revision}`}
      description={`${contact} answers each change in the next revision of the offer. Until then nothing changes, and you can't sign revision ${revision}.`}
      footer={
        <>
          <Button size="lg" onClick={close}>
            Cancel
          </Button>
          <Button size="lg" variant="primary" onClick={send}>
            Send request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* A section, not a Field: a label around the list would hand every click in it to its first button. */}
        <section aria-label="Tasks" className="flex flex-col gap-2">
          <span className="text-[14px] leading-[1.2] font-semibold tracking-[0.2px] text-ink">Tasks</span>
          <SuggestTasks tasks={offer.tasks} weeks={planWeeks(offer.type === "trial" ? days : null)} company={company} value={suggestions} onChange={setSuggestions} />
        </section>
        <Field label={offer.type === "full-time" ? "Salary you'd sign for" : "Rate you'd sign for"} hint={`Optional. The offer says ${offer.rate}.`}>
          <Input value={rate} onChange={(e) => setRate(e.target.value)} placeholder={offer.rate} inputMode="decimal" className="!w-[200px]" />
        </Field>
        <Field label="What should change?" error={tried && problem ? problem : (error ?? undefined)}>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX} placeholder="e.g. Week 1 is tight for the audit — could it move to week 2? The rate should cover the extra logo round." aria-label="What should change?" />
        </Field>
      </div>
    </Modal>
  );
}
