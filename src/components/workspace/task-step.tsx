"use client";

import { useId, useState, type Ref } from "react";
import { ICONS } from "@/components/icons";
import { Button, Textarea } from "@/components/portal/ui";
import { refOf, unfinishedOf, type WorkItem } from "@/lib/work/model";
import { transitionFor } from "@/lib/work/permissions";
import { useWorkspace } from "./context";
import { unfinishedQuestion, type Step, type StepBox } from "./next-step";

/**
 * The item's next step, beside its status at the top of the sheet: one place for it, apart from the
 * comment box. A step that needs words first (the note with a review request, what should change)
 * opens its panel under the top bar, and its button steps aside while the panel is open.
 */
export function StepButtons({ step, item: t, onBox }: { step: Step; item: WorkItem; onBox: (box: StepBox) => void }) {
  const { actions } = useWorkspace();
  if (step === "submit")
    return (
      <Button size="sm" variant="primary" onClick={() => onBox("send")}>
        Send for review
      </Button>
    );
  if (step === "takeBack")
    return (
      <Button size="sm" onClick={() => void actions.transition(t, "doing", undefined, { success: `Took ${refOf(t)} back. It's In progress again.` })}>
        <ICONS.undo size={16} aria-hidden /> Take back to keep working
      </Button>
    );
  if (step === "review") return <ReviewButtons item={t} onAsk={() => onBox("changes")} />;
  if (step === "complete")
    return (
      <Button size="sm" variant="primary" title={t.assignee === "team" ? "Your own item, so it doesn't go through review." : "Nobody is assigned. Assign it, or mark it done yourself."} onClick={() => void actions.transition(t, "done", undefined, { success: `Marked ${refOf(t)} done` })}>
        <ICONS.check size={16} aria-hidden /> Mark done
      </Button>
    );
  return (
    <Button size="sm" onClick={() => void actions.transition(t, "todo", undefined, { announce: `Reopened ${refOf(t)}` })}>
      <ICONS.undo size={16} aria-hidden /> Reopen
    </Button>
  );
}

/**
 * The Team Builder's, on work in review: approve it — at the end, nearest the edge — or ask for
 * changes, which says why it can't where nothing can be sent back (a trial that's over).
 */
function ReviewButtons({ item: t, onAsk }: { item: WorkItem; onAsk: () => void }) {
  const { actor, access, actions, names } = useWorkspace();
  const sendBack = transitionFor(t, actor, access, "doing", names);
  return (
    <>
      <Button size="sm" disabled={!sendBack.ok} title={sendBack.ok ? undefined : sendBack.reason} onClick={onAsk}>
        Request changes
      </Button>
      <Button size="sm" variant="primary" onClick={() => void actions.transition(t, "done", undefined, { success: `Approved ${refOf(t)}. ${names.independent} has been told.` })}>
        Approve
      </Button>
    </>
  );
}

/**
 * The open step's panel, under the top bar: the send with its note (and the question unfinished work
 * asks), or what should change. `onDone` closes it, saying whether it was sent.
 */
export function StepPanel({ box, item, byId, firstRef, onDone }: { box: StepBox; item: WorkItem; byId: ReadonlyMap<string, WorkItem>; /** Where the sheet starts when it's opened to send unfinished work. */ firstRef: Ref<HTMLTextAreaElement>; onDone: (sent: boolean) => void }) {
  return <div className="rounded-lg bg-surface-alt p-3 outline -outline-offset-1 outline-[#ebebeb]">{box === "send" ? <SendPanel item={item} byId={byId} firstRef={firstRef} onDone={onDone} /> : <ChangesBox item={item} onDone={onDone} />}</div>;
}

/**
 * The Independent's send for review: a note for the Team Builder if they want one, and — for work that
 * still waits on something or has subtasks open — the one question of whether to send it anyway.
 */
function SendPanel({ item: t, byId, firstRef, onDone }: { item: WorkItem; byId: ReadonlyMap<string, WorkItem>; firstRef: Ref<HTMLTextAreaElement>; onDone: (sent: boolean) => void }) {
  const { actions, names } = useWorkspace();
  const [note, setNote] = useState("");
  const id = useId();
  const unfinished = unfinishedOf(t, byId);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void actions.transition(t, "review", note.trim() || undefined, { success: `Sent ${refOf(t)} to ${names.team} for review` });
        onDone(true);
      }}
      className="flex flex-col gap-2"
    >
      {unfinished && (
        <p id={`${id}-q`} className="text-[13.5px] leading-[1.4] text-ink">
          {unfinishedQuestion(t, unfinished)}
        </p>
      )}
      <label htmlFor={`${id}-note`} className="text-[13px] leading-[1.4] font-semibold text-ink">
        Note for {names.team} (optional)
      </label>
      {/* The button that opened the panel is gone: the note takes the focus, the question read with it. */}
      <Textarea ref={firstRef} id={`${id}-note`} rows={2} autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={`What ${names.team} should look at: links, anything to check`} aria-describedby={unfinished ? `${id}-q` : undefined} maxLength={1000} />
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => onDone(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" variant="primary">
          Send for review
        </Button>
      </div>
    </form>
  );
}

/** What should change: the box's label says who it's for, and Send request waits for words, saying so beside it. */
function ChangesBox({ item: t, onDone }: { item: WorkItem; onDone: (sent: boolean) => void }) {
  const { actions, names } = useWorkspace();
  const [changes, setChanges] = useState("");
  const id = useId();
  const empty = !changes.trim();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] leading-[1.4] font-semibold text-ink">
        What should {names.independent} change?
      </label>
      <Textarea id={id} rows={3} autoFocus value={changes} onChange={(e) => setChanges(e.target.value)} maxLength={1000} />
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        {empty && <span className="text-[12.5px] leading-[1.4] text-ink-2">Write what should change first.</span>}
        <Button size="sm" onClick={() => onDone(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={empty}
          onClick={() => {
            void actions.transition(t, "doing", changes, { success: `Sent ${refOf(t)} back to ${names.independent} with your note` });
            onDone(true);
          }}
        >
          Send request
        </Button>
      </div>
    </div>
  );
}
