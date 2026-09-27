"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ICONS } from "@/components/admin/icons";
import { Button } from "@/components/independent/ui";
import { BACKUP_KEY, resetUnreadableDeal } from "@/lib/demo/deal";
import type { Role } from "@/lib/work/permissions";
import type { ViewKey } from "@/lib/work/query";

/** Placeholders shaped like the view that's loading, so nothing jumps when it arrives. */
export function WorkspaceSkeleton({ view }: { view: ViewKey }) {
  const bar = "animate-pulse rounded bg-surface-2";
  return (
    <div role="status" aria-label="Loading work" className="flex min-h-0 flex-1 flex-col gap-3 px-[var(--ws-gutter,1rem)] pt-3">
      {view === "board" ? (
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((c) => (
            <div key={c} className="flex w-[288px] shrink-0 flex-col gap-2 rounded-xl border-2 border-transparent bg-[#f7f7f7] p-2">
              <div className={`${bar} h-8`} />
              {[0, 1, 2].slice(0, 3 - (c % 2)).map((r) => (
                <div key={r} className={`${bar} h-24 bg-white outline -outline-offset-1 outline-border`} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-2">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${bar} h-8`} style={{ width: `${70 + ((i * 7) % 30)}%` }} />
          ))}
        </div>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function Panel({ icon, title, body, children }: { icon: ReactNode; title: string; body: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-1 items-start justify-center px-[var(--ws-gutter,1rem)] py-10">
      <div className="flex max-w-[480px] flex-col items-center gap-3 rounded-xl bg-[#fafafa] px-8 py-10 text-center outline -outline-offset-1 outline-border">
        <span className="flex size-11 items-center justify-center rounded-full bg-white text-ink-2 outline -outline-offset-1 outline-border">{icon}</span>
        <h2 className="text-[16px] leading-[1.4] font-semibold text-ink">{title}</h2>
        <div className="text-[13.5px] leading-[1.5] text-ink-2">{body}</div>
        {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

/** A trial with no tasks: its work is what the signed offer agreed, so none are coming (TB-064). */
function noTrialWork(role: Role, independent: string) {
  if (role === "manager") return `The offer ${independent} signed has no tasks, and none are added during a trial.`;
  return role === "contributor" ? "The offer you signed has no tasks, and none are added during a trial." : "The signed offer has no tasks for this trial.";
}

/** Nothing on the contract yet — said for who's reading. */
export function NoWork({ role, team, independent, trial, onAdd }: { role: Role; team: string; independent: string; trial: boolean; onAdd?: () => void }) {
  return (
    <Panel
      icon={<ICONS.inbox size={22} aria-hidden />}
      title={trial ? "No trial tasks" : "No work yet"}
      body={
        trial
          ? noTrialWork(role, independent)
          : role === "manager"
            ? "Add the first task. Give it a due date or a start and due, an effort estimate, and who does it — every view picks it up."
            : role === "contributor"
              ? `${team} adds the work here. You're told each time something is added, and it shows up in every view.`
              : "Nothing has been added to this contract yet."
      }
    >
      {onAdd && (
        <Button variant="primary" onClick={onAdd}>
          <ICONS.add size={18} aria-hidden /> Add task
        </Button>
      )}
    </Panel>
  );
}

export function NoMatches({ onClear, archived }: { onClear: () => void; archived: boolean }) {
  return (
    <Panel icon={<ICONS.filter size={22} aria-hidden />} title={archived ? "Nothing deleted matches" : "No work matches these filters"} body="Change the search or the filters, or clear them to see everything.">
      <Button onClick={onClear}>Clear filters</Button>
    </Panel>
  );
}

export function MissingContract() {
  return <Panel icon={<ICONS.warning size={22} aria-hidden />} title="This contract isn't available" body="It may have been reset or never started. Go back to the contracts list and open it again." />;
}

/** The saved data can't be read. It is left as it is (and copied), never written over. */
export function CorruptWork() {
  return (
    <Panel
      icon={<ICONS.warning size={22} aria-hidden />}
      title="This contract's saved work can't be read"
      body={
        <>
          Nothing has been changed or deleted. A copy of what was saved is kept in this browser under <code className="rounded bg-white px-1">{BACKUP_KEY}</code>. Try again, or reset the demo data to start over.
        </>
      }
    >
      <Button onClick={() => location.reload()}>
        <ICONS.retry size={18} aria-hidden /> Try again
      </Button>
      <Button variant="danger" onClick={() => resetUnreadableDeal()}>
        Reset demo data
      </Button>
    </Panel>
  );
}

/**
 * A view that throws shows this instead of taking the whole page down, with Retry. The error is
 * logged (it's a bug), not shown — the user gets a plain sentence.
 */
export class ViewBoundary extends Component<{ children: ReactNode; label: string }, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.failed)
      return (
        <Panel icon={<ICONS.warning size={22} aria-hidden />} title={`The ${this.props.label} couldn't be shown`} body="Something went wrong drawing it. Your work is saved; try again.">
          <Button onClick={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))}>
            <ICONS.retry size={18} aria-hidden /> Retry
          </Button>
        </Panel>
      );
    return <div key={this.state.attempt} className="flex min-h-0 min-w-0 flex-1 flex-col">{this.props.children}</div>;
  }
}
